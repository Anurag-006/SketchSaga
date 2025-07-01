import express, { Request, Response } from "express";
import { prismaClient } from "@repo/database/client";
import jwt, { JwtPayload } from "jsonwebtoken";
import bodyParser from "body-parser";
import { roomMiddleware } from "./middleware.js";
import { JWT_SECRET } from "@repo/backend-common/config";
import cors from "cors";
import {
  createRoomSchema,
  createUserSchema,
  signInSchema,
} from "@repo/common/types";

interface AuthenticatedRequest extends Request {
  user?: string | JwtPayload;
}

const app = express();

app.use(bodyParser.json());
app.use(cors());

app.listen(4001, () => {
  console.log("Server started on PORT:", 4001);
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

    await prismaClient.user.create({
      data: { email, photo, password, name },
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

    const correctPassword = password === user.password;
    if (!correctPassword) {
      res
        .status(403)
        .json({ message: "Incorrect credentials", success: false });
      return;
    }

    const newToken = jwt.sign({ userId: user.id }, JWT_SECRET, {
      expiresIn: "1h",
    });

    res.status(200).json({
      message: "User sign-in successful",
      success: true,
      accessToken: newToken,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error", success: false });
  }
});

app.post("/room", roomMiddleware, async (req, res) => {
  const parsedData = createRoomSchema.safeParse(req.body);
  if (!parsedData.success) {
    res.status(203).json({
      messsage: "Incorrect inputs",
      success: false,
    });
  }
  // @ts-ignore
  const userId = req.userId;
  try {
    await prismaClient.room.create({
      data: {
        slug: parsedData.data?.name as string,
        adminId: userId,
      },
    });

    res.status(200).json({
      message: "Room created successfully",
      roomId: parsedData.data?.name,
    });
  } catch (error) {
    res.status(411).json({
      message: "Room already exists with this name",
      success: false,
    });
  }
});

app.get("/chats/:roomId", async (req, res) => {
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
