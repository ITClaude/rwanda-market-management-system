import { Router, type IRouter } from "express";
import { eq, and, type SQL } from "drizzle-orm";
import { db, vendorsTable, slotsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import {
  CreateVendorBody,
  UpdateVendorBody,
  GetVendorParams,
  UpdateVendorParams,
  ListVendorsQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function formatVendor(vendor: typeof vendorsTable.$inferSelect, slotNumber?: string | null) {
  return {
    ...vendor,
    slotNumber: slotNumber ?? null,
    registeredAt: vendor.registeredAt.toISOString(),
    createdAt: vendor.createdAt.toISOString(),
    updatedAt: vendor.updatedAt.toISOString(),
  };
}

router.get("/vendors", requireAuth, async (req, res): Promise<void> => {
  const params = ListVendorsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const conditions: SQL[] = [];
  if (params.data.marketId != null) conditions.push(eq(vendorsTable.marketId, params.data.marketId));

  const vendors = conditions.length
    ? await db.select().from(vendorsTable).where(and(...conditions)).orderBy(vendorsTable.name)
    : await db.select().from(vendorsTable).orderBy(vendorsTable.name);

  const slotIds = vendors.filter(v => v.slotId != null).map(v => v.slotId as number);
  const slots = slotIds.length
    ? await db.select({ id: slotsTable.id, slotNumber: slotsTable.slotNumber }).from(slotsTable)
    : [];
  const slotMap = new Map(slots.map(s => [s.id, s.slotNumber]));

  res.json(vendors.map(v => formatVendor(v, v.slotId ? slotMap.get(v.slotId) : null)));
});

router.post("/vendors", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateVendorBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [vendor] = await db.insert(vendorsTable).values({
    ...parsed.data,
    status: "ACTIVE",
    registeredAt: new Date(),
  }).returning();

  res.status(201).json(formatVendor(vendor));
});

router.get("/vendors/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetVendorParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [vendor] = await db.select().from(vendorsTable).where(eq(vendorsTable.id, params.data.id));
  if (!vendor) {
    res.status(404).json({ error: "Vendor not found" });
    return;
  }

  let slotNumber: string | null = null;
  if (vendor.slotId) {
    const [slot] = await db.select({ slotNumber: slotsTable.slotNumber }).from(slotsTable).where(eq(slotsTable.id, vendor.slotId));
    slotNumber = slot?.slotNumber ?? null;
  }

  res.json(formatVendor(vendor, slotNumber));
});

router.patch("/vendors/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateVendorParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateVendorBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [vendor] = await db.update(vendorsTable).set(parsed.data).where(eq(vendorsTable.id, params.data.id)).returning();
  if (!vendor) {
    res.status(404).json({ error: "Vendor not found" });
    return;
  }

  res.json(formatVendor(vendor));
});

export default router;
