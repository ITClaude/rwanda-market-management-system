import { Router, type IRouter } from "express";
import { eq, and, type SQL, lte, desc } from "drizzle-orm";
import { db, notificationsTable, vendorsTable, paymentsTable, marketsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { ListNotificationsQueryParams } from "@workspace/api-zod";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.get("/notifications", requireAuth, async (req, res): Promise<void> => {
  const params = ListNotificationsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const conditions: SQL[] = [];
  if (params.data.marketId != null) conditions.push(eq(notificationsTable.marketId, params.data.marketId));

  const limit = params.data.limit ?? 50;

  const notifications = conditions.length
    ? await db.select().from(notificationsTable).where(and(...conditions)).orderBy(desc(notificationsTable.createdAt)).limit(limit)
    : await db.select().from(notificationsTable).orderBy(desc(notificationsTable.createdAt)).limit(limit);

  const vendorIds = [...new Set(notifications.filter(n => n.vendorId != null).map(n => n.vendorId as number))];
  const vendors = vendorIds.length
    ? await db.select({ id: vendorsTable.id, name: vendorsTable.name }).from(vendorsTable)
    : [];
  const vendorMap = new Map(vendors.map(v => [v.id, v.name]));

  res.json(notifications.map(n => ({
    ...n,
    vendorName: n.vendorId ? (vendorMap.get(n.vendorId) ?? null) : null,
    createdAt: n.createdAt.toISOString(),
  })));
});

router.post("/notifications/trigger", requireAuth, async (req, res): Promise<void> => {
  const today = new Date().toISOString().split("T")[0]!;
  const sevenDaysLater = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]!;

  const overduePayments = await db.select().from(paymentsTable)
    .where(and(eq(paymentsTable.status, "DUE"), lte(paymentsTable.dueDate, today)));

  const upcomingPayments = await db.select().from(paymentsTable)
    .where(and(eq(paymentsTable.status, "DUE"), lte(paymentsTable.dueDate, sevenDaysLater)));

  let sent = 0;

  for (const payment of overduePayments) {
    const [vendor] = await db.select().from(vendorsTable).where(eq(vendorsTable.id, payment.vendorId));
    if (!vendor) continue;

    const msg = `[SMS SIMULATED] Dear ${vendor.name}, your payment of RWF ${payment.amount} was due on ${payment.dueDate}. Please pay immediately to avoid penalties.`;
    logger.info({ paymentId: payment.id, vendorId: vendor.id }, msg);

    await db.update(paymentsTable).set({ status: "OVERDUE" }).where(eq(paymentsTable.id, payment.id));

    await db.insert(notificationsTable).values({
      vendorId: vendor.id,
      marketId: payment.marketId,
      type: "OVERDUE_REMINDER",
      message: msg,
      channel: "SMS",
      status: "SENT",
    });
    sent++;
  }

  for (const payment of upcomingPayments) {
    const dueDate = new Date(payment.dueDate);
    const daysUntilDue = Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysUntilDue > 0 && daysUntilDue <= 7) {
      const [vendor] = await db.select().from(vendorsTable).where(eq(vendorsTable.id, payment.vendorId));
      if (!vendor) continue;

      const msg = `[SMS SIMULATED] Reminder: Dear ${vendor.name}, your payment of RWF ${payment.amount} is due in ${daysUntilDue} day(s) on ${payment.dueDate}.`;
      logger.info({ paymentId: payment.id, vendorId: vendor.id }, msg);

      await db.insert(notificationsTable).values({
        vendorId: vendor.id,
        marketId: payment.marketId,
        type: "UPCOMING_REMINDER",
        message: msg,
        channel: "SMS",
        status: "SENT",
      });
      sent++;
    }
  }

  logger.info({ sent }, "Notification trigger complete");

  res.json({ sent, message: `Triggered ${sent} notifications. Check server logs for simulated SMS/email output.` });
});

export default router;
