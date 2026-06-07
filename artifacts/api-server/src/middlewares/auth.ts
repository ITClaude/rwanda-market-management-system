import { type Request, type Response, type NextFunction } from "express";
import { verifyToken } from "../routes/auth";

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers["authorization"];
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const token = authHeader.slice(7);
  try {
    const decoded = verifyToken(token);
    (req as Request & { user: typeof decoded }).user = decoded;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}
