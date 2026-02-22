import { z } from "zod";

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(1).max(50),
  photo: z.string().url().default("https://example.com/default-profile.png"),
});

export const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const createRoomSchema = z.object({
  name: z.string().min(1).max(50).optional(),
});
