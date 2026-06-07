import { pgTable, text, serial, integer, timestamp, decimal, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const slotsTable = pgTable("slots", {
  id: serial("id").primaryKey(),
  marketId: integer("market_id").notNull(),
  slotNumber: text("slot_number").notNull(),
  zone: text("zone").notNull(),
  slotSize: text("slot_size").notNull().default("MEDIUM"),
  slotType: text("slot_type").notNull().default("INDOOR"),
  monthlyFee: decimal("monthly_fee", { precision: 12, scale: 2 }).notNull(),
  status: text("status").notNull().default("AVAILABLE"),
  vendorId: integer("vendor_id"),
  occupiedSince: date("occupied_since"),
  contractStartDate: date("contract_start_date"),
  contractEndDate: date("contract_end_date"),
  paymentCycle: text("payment_cycle"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertSlotSchema = createInsertSchema(slotsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSlot = z.infer<typeof insertSlotSchema>;
export type Slot = typeof slotsTable.$inferSelect;
