import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { JWT_SECRET } from "@repo/backend-common/config";

interface AuthenticatedRequest extends Request {
  userId?: string;
}

export function roomMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const token = req.cookies?.token;

  if (!token) {
    res.status(401).json({ message: "Unauthorized: No token provided" });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;

    if (typeof decoded === "object" && decoded.userId) {
      req.userId = decoded.userId;
      next();
    } else {
      res.status(401).json({ message: "Invalid token payload" });
    }
  } catch (error) {
    console.error("JWT verification error:", error);
    res.status(401).json({ message: "Invalid or expired token" });
  }
}
