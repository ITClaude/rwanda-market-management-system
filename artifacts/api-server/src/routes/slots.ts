import { Router, type IRouter } from "express";
import { eq, and, type SQL } from "drizzle-orm";
import { db, slotsTable, vendorsTable, notificationsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import {
  CreateSlotBody,
  UpdateSlotBody,
  GetSlotParams,
  UpdateSlotParams,
  AssignVendorToSlotParams,
  AssignVendorToSlotBody,
  VacateSlotParams,
  ListSlotsQueryParams,
} from "@workspace/api-zod";
import { logger } from "../lib/logger";

const router: IRouter = Router();

function formatSlot(slot: typeof slotsTable.$inferSelect, vendorName?: string | null) {
  return {
    ...slot,
    monthlyFee: parseFloat(slot.monthlyFee),
    vendorName: vendorName ?? null,
    createdAt: slot.createdAt.toISOString(),
    updatedAt: slot.updatedAt.toISOString(),
  };
}

router.get("/slots", requireAuth, async (req, res): Promise<void> => {
  const params = ListSlotsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const { marketId, status, zone } = params.data;

  const conditions: SQL[] = [];
  if (marketId != null) conditions.push(eq(slotsTable.marketId, marketId));
  if (status != null) conditions.push(eq(slotsTable.status, status));
  if (zone != null) conditions.push(eq(slotsTable.zone, zone));

  const slots = conditions.length
    ? await db.select().from(slotsTable).where(and(...conditions)).orderBy(slotsTable.slotNumber)
    : await db.select().from(slotsTable).orderBy(slotsTable.slotNumber);

  const vendorIds = slots.filter(s => s.vendorId != null).map(s => s.vendorId as number);
  const vendors = vendorIds.length
    ? await db.select({ id: vendorsTable.id, name: vendorsTable.name }).from(vendorsTable)
    : [];
  const vendorMap = new Map(vendors.map(v => [v.id, v.name]));

  res.json(slots.map(s => formatSlot(s, s.vendorId ? vendorMap.get(s.vendorId) : null)));
});

router.post("/slots", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateSlotBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [slot] = await db.insert(slotsTable).values({
    ...parsed.data,
    monthlyFee: String(parsed.data.monthlyFee),
    status: "AVAILABLE",
  }).returning();

  res.status(201).json(formatSlot(slot));
});

router.get("/slots/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetSlotParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [slot] = await db.select().from(slotsTable).where(eq(slotsTable.id, params.data.id));
  if (!slot) {
    res.status(404).json({ error: "Slot not found" });
    return;
  }

  let vendorName: string | null = null;
  if (slot.vendorId) {
    const [vendor] = await db.select({ name: vendorsTable.name }).from(vendorsTable).where(eq(vendorsTable.id, slot.vendorId));
    vendorName = vendor?.name ?? null;
  }

  res.json(formatSlot(slot, vendorName));
});

router.patch("/slots/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateSlotParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateSlotBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Partial<typeof slotsTable.$inferInsert> = { ...parsed.data };
  if (parsed.data.monthlyFee != null) {
    updateData.monthlyFee = String(parsed.data.monthlyFee);
  }

  const [slot] = await db.update(slotsTable).set(updateData).where(eq(slotsTable.id, params.data.id)).returning();
  if (!slot) {
    res.status(404).json({ error: "Slot not found" });
    return;
  }

  res.json(formatSlot(slot));
});

router.post("/slots/:id/assign", requireAuth, async (req, res): Promise<void> => {
  const params = AssignVendorToSlotParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = AssignVendorToSlotBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [existing] = await db.select().from(slotsTable).where(eq(slotsTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "Slot not found" });
    return;
  }

  if (existing.status === "OCCUPIED") {
    res.status(400).json({ error: "Slot is already occupied" });
    return;
  }

  const today = new Date().toISOString().split("T")[0]!;

  const [slot] = await db.update(slotsTable).set({
    vendorId: parsed.data.vendorId,
    status: "OCCUPIED",
    occupiedSince: today,
    contractStartDate: parsed.data.contractStartDate,
    contractEndDate: parsed.data.contractEndDate ?? null,
    paymentCycle: parsed.data.paymentCycle,
  }).where(eq(slotsTable.id, params.data.id)).returning();

  await db.update(vendorsTable).set({
    slotId: params.data.id,
    marketId: slot.marketId,
  }).where(eq(vendorsTable.id, parsed.data.vendorId));

  const [vendor] = await db.select({ name: vendorsTable.name }).from(vendorsTable).where(eq(vendorsTable.id, parsed.data.vendorId));

  const msg = `[SMS SIMULATED] Welcome ${vendor?.name ?? "Vendor"}! You have been assigned to slot ${slot.slotNumber}. First payment of RWF ${slot.monthlyFee} due on ${parsed.data.firstPaymentDueDate}.`;
  logger.info({ slotId: slot.id, vendorId: parsed.data.vendorId }, msg);

  await db.insert(notificationsTable).values({
    vendorId: parsed.data.vendorId,
    marketId: slot.marketId,
    type: "WELCOME",
    message: msg,
    channel: "SMS",
    status: "SENT",
  });

  res.json(formatSlot(slot, vendor?.name ?? null));
});

router.post("/slots/:id/vacate", requireAuth, async (req, res): Promise<void> => {
  const params = VacateSlotParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [existing] = await db.select().from(slotsTable).where(eq(slotsTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "Slot not found" });
    return;
  }

  if (existing.vendorId) {
    await db.update(vendorsTable).set({ slotId: null }).where(eq(vendorsTable.id, existing.vendorId));
  }

  const [slot] = await db.update(slotsTable).set({
    vendorId: null,
    status: "AVAILABLE",
    occupiedSince: null,
    contractStartDate: null,
    contractEndDate: null,
    paymentCycle: null,
  }).where(eq(slotsTable.id, params.data.id)).returning();

  res.json(formatSlot(slot));
});

export default router;
