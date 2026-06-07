import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, marketsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { CreateMarketBody, UpdateMarketBody, GetMarketParams, UpdateMarketParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/markets", requireAuth, async (req, res): Promise<void> => {
  const markets = await db.select().from(marketsTable).orderBy(marketsTable.name);
  res.json(markets.map(m => ({
    ...m,
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
  })));
});

router.post("/markets", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateMarketBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [market] = await db.insert(marketsTable).values(parsed.data).returning();
  res.status(201).json({
    ...market,
    createdAt: market.createdAt.toISOString(),
    updatedAt: market.updatedAt.toISOString(),
  });
});

router.get("/markets/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetMarketParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [market] = await db.select().from(marketsTable).where(eq(marketsTable.id, params.data.id));
  if (!market) {
    res.status(404).json({ error: "Market not found" });
    return;
  }

  res.json({
    ...market,
    createdAt: market.createdAt.toISOString(),
    updatedAt: market.updatedAt.toISOString(),
  });
});

router.patch("/markets/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateMarketParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateMarketBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [market] = await db.update(marketsTable).set(parsed.data).where(eq(marketsTable.id, params.data.id)).returning();
  if (!market) {
    res.status(404).json({ error: "Market not found" });
    return;
  }

  res.json({
    ...market,
    createdAt: market.createdAt.toISOString(),
    updatedAt: market.updatedAt.toISOString(),
  });
});

export default router;
