import { z } from "zod";

export const createUserSchema = z.object({
  email: z.string().min(3).max(20),
  password: z.string(),
  name: z.string(),
  photo: z.string(),
});

export const signInSchema = z.object({
  email: z.string().min(3).max(20),
  password: z.string(),
});

export const createRoomSchema = z.object({
  name: z.string().min(3).max(20),
});
