import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { LoginBody } from "@workspace/api-zod";

const router: IRouter = Router();

const JWT_SECRET = process.env["SESSION_SECRET"] ?? "rmms-secret-key-change-in-production";

export function verifyToken(token: string) {
  return jwt.verify(token, JWT_SECRET) as { userId: number; role: string; marketId: number | null };
}

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { username, password } = parsed.data;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.username, username));

  if (!user) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const token = jwt.sign(
    { userId: user.id, role: user.role, marketId: user.marketId },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  req.log.info({ userId: user.id, role: user.role }, "User logged in");

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      marketId: user.marketId,
      name: user.name,
      createdAt: user.createdAt.toISOString(),
    },
  });
});

router.get("/auth/me", async (req, res): Promise<void> => {
  const authHeader = req.headers["authorization"];
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "No token" });
    return;
  }

  const token = authHeader.slice(7);
  try {
    const decoded = verifyToken(token);
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, decoded.userId));
    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }
    res.json({
      id: user.id,
      username: user.username,
      role: user.role,
      marketId: user.marketId,
      name: user.name,
      createdAt: user.createdAt.toISOString(),
    });
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
});

export default router;
