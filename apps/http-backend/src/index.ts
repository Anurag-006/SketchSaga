import express, { Request, Response } from "express";
import { prismaClient } from "@repo/database/client";
import jwt, { JwtPayload } from "jsonwebtoken";
import bodyParser from "body-parser";
import { roomMiddleware } from "./middleware.js";
import { JWT_SECRET } from "@repo/backend-common/config";
import cors from "cors";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import path from "path";
import cookieParser from "cookie-parser";
import { fileURLToPath } from 'url';

import {
  createRoomSchema,
  createUserSchema,
  signInSchema,
} from "@repo/common/types";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env") });

interface AuthenticatedRequest extends Request {
  user?: string | JwtPayload;
}

const app = express();

app.use(bodyParser.json());
app.use(cookieParser());

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000", // frontend
    credentials: true, // allow cookies if needed
  }),
);

const PORT = process.env.PORT || 4001;

app.listen(PORT, () => {
  console.log("Server started on PORT:", PORT);
});

app.post("/signup", async (req: Request, res: Response) => {
  try {
    const parsedData = createUserSchema.safeParse(req.body);

    if (!parsedData.success) {
      res.json({
        message: "Incorrect inputs",
      });
      return;
    }

    const { password, email, name, photo } = parsedData.data;

    //TODO: Hash the password

    const hashedPassword = await bcrypt.hash(password, 10);

    await prismaClient.user.create({
      data: { email, photo, password: hashedPassword, name },
    });

    res.status(200).json({
      message: "New user created successfully",
      success: true,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error", success: false });
  }
});

app.post("/signin", async (req: Request, res: Response) => {
  try {
    const data = signInSchema.safeParse(req.body);

    if (!data.success) {
      res.json({
        message: "Incorrect inputs",
      });
      return;
    }

    const { password, email } = data.data;

    const user = await prismaClient.user.findFirst({ where: { email } });

    if (!user) {
      res.status(405).json({ message: "User does not exist", success: false });
      return;
    }

    const correctPassword = await bcrypt.compare(password, user.password);

    if (!correctPassword) {
      res
        .status(403)
        .json({ message: "Incorrect credentials", success: false });
      return;
    }

    const newToken = jwt.sign({ userId: user.id }, JWT_SECRET, {
      expiresIn: "1h",
    });


    res
      .cookie("token", newToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 3600000, // 1 hour
        path: "/"
      })
      .json({ message: "Sign-in successful", success: true, token: newToken });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error", success: false });
  }
});

function generateRoomCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit number
}

app.post("/room", roomMiddleware, async (req, res) => {
  //@ts-ignore
  const userId = (req as AuthenticatedRequest).userId;

  let slug = generateRoomCode();

  let existingRoom = await prismaClient.room.findUnique({
    where: { slug },
  });

  let tries = 0;
  while (existingRoom && tries < 5) {
    slug = generateRoomCode();
    existingRoom = await prismaClient.room.findUnique({ where: { slug } });
    tries++;
  }

  if (existingRoom) {
    return res.status(500).json({
      message: "Failed to generate a unique room code. Try again.",
      success: false,
    });
  }

  try {
    const createdRoom = await prismaClient.room.create({
      data: {
        slug,
        adminId: userId!,
      },
    });

    res.status(200).json({
      message: "Room created successfully",
      room: createdRoom
    });
  } catch (error) {
    res.status(500).json({
      message: "Unexpected error",
      success: false,
    });
  }
});

app.get("/chats/:roomId", roomMiddleware, async (req, res) => {
  const roomId = Number(req.params.roomId);
  const messages = await prismaClient.chat.findMany({
    where: {
      roomId: Number(roomId),
    },
    orderBy: {
      id: "desc",
    },
    take: 50,
  });

  res.status(200).json({
    messages: messages,
    success: true,
  });
});

app.get("/room/:slug", async (req, res) => {
  const slug = req.params.slug;

  const room = await prismaClient.room.findFirst({
    where: {
      slug,
    },
  });

  res.status(200).json({
    room,
    success: true,
  });
});

app.get("/me", roomMiddleware, (req: Request, res: Response) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ user: null });

  try {
    const user = jwt.verify(token, JWT_SECRET) as JwtPayload;
    res.json({ user });
  } catch {
    res.status(401).json({ user: null });
  }
});