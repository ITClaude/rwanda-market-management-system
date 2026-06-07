import { Router, type IRouter } from "express";
import { eq, and, type SQL } from "drizzle-orm";
import { db, paymentsTable, vendorsTable, slotsTable, marketsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import {
  CreatePaymentBody,
  UpdatePaymentBody,
  GetPaymentParams,
  UpdatePaymentParams,
  ListPaymentsQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

async function enrichPayment(p: typeof paymentsTable.$inferSelect) {
  const [vendor] = await db.select({ name: vendorsTable.name }).from(vendorsTable).where(eq(vendorsTable.id, p.vendorId));
  const [slot] = await db.select({ slotNumber: slotsTable.slotNumber }).from(slotsTable).where(eq(slotsTable.id, p.slotId));
  const [market] = await db.select({ name: marketsTable.name }).from(marketsTable).where(eq(marketsTable.id, p.marketId));

  return {
    ...p,
    amount: parseFloat(p.amount),
    vendorName: vendor?.name ?? null,
    slotNumber: slot?.slotNumber ?? null,
    marketName: market?.name ?? null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

router.get("/payments", requireAuth, async (req, res): Promise<void> => {
  const params = ListPaymentsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const conditions: SQL[] = [];
  if (params.data.marketId != null) conditions.push(eq(paymentsTable.marketId, params.data.marketId));
  if (params.data.vendorId != null) conditions.push(eq(paymentsTable.vendorId, params.data.vendorId));
  if (params.data.status != null) conditions.push(eq(paymentsTable.status, params.data.status));

  const payments = conditions.length
    ? await db.select().from(paymentsTable).where(and(...conditions)).orderBy(paymentsTable.dueDate)
    : await db.select().from(paymentsTable).orderBy(paymentsTable.dueDate);

  const enriched = await Promise.all(payments.map(enrichPayment));
  res.json(enriched);
});

router.post("/payments", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreatePaymentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [payment] = await db.insert(paymentsTable).values({
    ...parsed.data,
    amount: String(parsed.data.amount),
  }).returning();

  res.status(201).json(await enrichPayment(payment));
});

router.get("/payments/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetPaymentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [payment] = await db.select().from(paymentsTable).where(eq(paymentsTable.id, params.data.id));
  if (!payment) {
    res.status(404).json({ error: "Payment not found" });
    return;
  }

  res.json(await enrichPayment(payment));
});

router.patch("/payments/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdatePaymentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdatePaymentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Partial<typeof paymentsTable.$inferInsert> = { ...parsed.data };
  if (parsed.data.amount != null) updateData.amount = String(parsed.data.amount);

  const [payment] = await db.update(paymentsTable).set(updateData).where(eq(paymentsTable.id, params.data.id)).returning();
  if (!payment) {
    res.status(404).json({ error: "Payment not found" });
    return;
  }

  res.json(await enrichPayment(payment));
});

export default router;
