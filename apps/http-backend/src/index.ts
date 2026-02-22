import express, { Application, Request, Response } from "express";
import { prismaClient } from "@repo/database/client";
import jwt, { JwtPayload } from "jsonwebtoken";
import bodyParser from "body-parser";
import { roomMiddleware, optionalAuth } from "./middleware.js";
import { JWT_SECRET } from "@repo/backend-common/config";
import cors from "cors";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import path from "path";
import cookieParser from "cookie-parser";
import { fileURLToPath } from "url";
import { createClient } from "redis";
import pino from "pino";

import {
  createRoomSchema,
  createUserSchema,
  signInSchema,
} from "@repo/common/types";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });
const logger = pino();

process.on("uncaughtException", (err) => {
  logger.error({ err }, "Uncaught Exception");
});
process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "Unhandled Rejection");
});

// --- REDIS SETUP ---
const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
const redisClient = createClient({ url: redisUrl });

// Await Redis connection before accepting requests
await redisClient.connect();
logger.info("✅ HTTP Backend connected to Redis");

interface AuthenticatedRequest extends Request {
  user?: string | JwtPayload;
  userId?: string;
}

const app: Application = express();

app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

app.use(bodyParser.json());
app.use(cookieParser());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  }),
);

const PORT = Number(process.env.PORT) || 4001;

app.listen(PORT, "0.0.0.0", () => {
  logger.info({ port: PORT }, "HTTP Server started");
});

// ---------------- AUTH ----------------
// (Auth routes remain completely unchanged)

app.post("/signup", async (req: Request, res: Response) => {
  try {
    const parsedData = createUserSchema.safeParse(req.body);
    if (!parsedData.success) {
      return res.json({
        message: "Incorrect inputs",
        errors: parsedData.error.format(),
      });
    }
    const { password, email, name } = parsedData.data;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prismaClient.user.create({
      data: { email, name, password: hashedPassword },
    });
    res.status(200).json({
      message: "New user created successfully",
      success: true,
      userId: user.id,
    });
  } catch (err) {
    logger.error({ err }, "Internal server error during signup");
    res.status(500).json({ message: "Internal server error", success: false });
  }
});

app.post("/signin", async (req: Request, res: Response) => {
  try {
    const parsed = signInSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.json({
        message: "Incorrect inputs",
        errors: parsed.error.format(),
      });
    }
    const { password, email } = parsed.data;
    const user = await prismaClient.user.findFirst({ where: { email } });

    if (!user)
      return res
        .status(405)
        .json({ message: "User does not exist", success: false });

    const correctPassword = await bcrypt.compare(password, user.password!);
    if (!correctPassword)
      return res
        .status(403)
        .json({ message: "Incorrect credentials", success: false });

    const newToken = jwt.sign({ userId: user.id }, JWT_SECRET, {
      expiresIn: "1h",
    });

    res
      .cookie("token", newToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 3600000,
        path: "/",
      })
      .json({
        message: "Sign-in successful",
        success: true,
        token: newToken,
        userId: user.id,
      });
  } catch (err) {
    logger.error({ err }, "Internal server error during signin");
    res.status(500).json({ message: "Internal server error", success: false });
  }
});

// ---------------- ROOMS ----------------

function generateRoomCode(): string {
  return "room-" + Math.floor(100000 + Math.random() * 900000).toString();
}

app.post("/room", optionalAuth, async (req, res) => {
  try {
    const parsed = createRoomSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ message: "Invalid room data", success: false });
    }

    const name = parsed.data.name ?? null;

    // Persistent Room Creation (Logged In)
    if ((req as AuthenticatedRequest).userId) {
      const userId = (req as AuthenticatedRequest).userId!;
      let slug = generateRoomCode();

      let existingRoom = await prismaClient.room.findUnique({
        where: { slug },
      });
      let isRedisClaimed = await redisClient.exists(`room:${slug}:active`);
      let tries = 0;

      while ((existingRoom || isRedisClaimed) && tries < 5) {
        slug = generateRoomCode();
        existingRoom = await prismaClient.room.findUnique({ where: { slug } });
        isRedisClaimed = await redisClient.exists(`room:${slug}:active`);
        tries++;
      }

      if (existingRoom || isRedisClaimed) {
        return res
          .status(500)
          .json({ message: "Failed to generate room code.", success: false });
      }

      const createdRoom = await prismaClient.room.create({
        data: { slug, ownerId: userId, name },
      });
      return res
        .status(200)
        .json({ message: "Room created", room: createdRoom });
    }

    // Ephemeral Room Creation (Guest)
    let slug = generateRoomCode();
    let tries = 0;
    let existsDb = await prismaClient.room.findUnique({ where: { slug } });
    let existsRedis = await redisClient.exists(`room:${slug}:active`);

    while ((existsRedis || existsDb) && tries < 5) {
      slug = generateRoomCode();
      existsDb = await prismaClient.room.findUnique({ where: { slug } });
      existsRedis = await redisClient.exists(`room:${slug}:active`);
      tries++;
    }

    if (existsRedis || existsDb) {
      return res
        .status(500)
        .json({ message: "Failed to generate room code.", success: false });
    }

    await redisClient.setEx(`room:${slug}:active`, 3600, "1");
    return res.status(200).json({
      message: "Ephemeral room created",
      room: { slug, name },
      ephemeral: true,
    });
  } catch (error) {
    // 👈 This guarantees the server will never crash from a DB failure
    logger.error({ error }, "Fatal error during POST /room");
    return res
      .status(500)
      .json({ message: "Internal server error", success: false });
  }
});

app.get("/room/:slug", optionalAuth, async (req, res) => {
  try {
    const slug = req.params.slug as string;

    const room = await prismaClient.room.findFirst({
      where: { slug },
      include: {
        chats: {
          orderBy: { createdAt: "asc" },
          include: { user: { select: { id: true, name: true } } },
        },
        shapes: true,
      },
    });

    if (room) return res.status(200).json({ room, success: true });

    const isActive = await redisClient.exists(`room:${slug}:active`);
    if (isActive) {
      return res
        .status(200)
        .json({ room: { slug, name: null }, success: true, ephemeral: true });
    }

    return res.status(404).json({ message: "Room not found", success: false });
  } catch (error) {
    logger.error({ error }, "Fatal error during GET /room/:slug");
    return res
      .status(500)
      .json({ message: "Internal server error", success: false });
  }
});

// ---------------- SHAPES ----------------

app.get("/shapes/:roomId", async (req, res) => {
  const rid = req.params.roomId as string;
  const numeric = Number(rid);

  if (isNaN(numeric)) {
    // Fetch all shapes from the Redis List
    const shapesData = await redisClient.lRange(`room:${rid}:shapes`, 0, -1);
    const shapes = shapesData.map((s) => JSON.parse(s));
    return res.json({ success: true, shapes });
  }

  const shapes = await prismaClient.shape.findMany({
    where: { roomId: numeric },
    orderBy: { id: "asc" },
  });

  res.json({
    success: true,
    shapes: shapes.map((s: any) => ({ ...s.data, id: s.id })),
  });
});

// ---------------- CHATS ----------------

app.get("/chats/:roomId", optionalAuth, async (req, res) => {
  const rid = req.params.roomId as string;
  const numeric = Number(rid);

  if (isNaN(numeric)) {
    // Fetch all chats from the Redis List
    const chatsData = await redisClient.lRange(`room:${rid}:chats`, 0, -1);
    const messages = chatsData.map((c) => JSON.parse(c));
    return res.status(200).json({ messages, success: true });
  }

  const messages = await prismaClient.chat.findMany({
    where: { roomId: numeric },
    orderBy: { id: "desc" },
    take: 50,
    include: { user: { select: { id: true, name: true } } },
  });

  res.status(200).json({ messages, success: true });
});

// ---------------- USER ----------------

app.get("/me", roomMiddleware, (req: Request, res: Response) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ user: null });

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    res.json({ user: { id: decoded.userId } });
  } catch {
    res.status(401).json({ user: null });
  }
});

export default app;
