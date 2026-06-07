import { Router, type IRouter } from "express";
import { eq, and, count, sum, desc } from "drizzle-orm";
import { db, marketsTable, slotsTable, vendorsTable, paymentsTable, expensesTable, notificationsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { GetMarketDashboardParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/dashboard/summary", requireAuth, async (req, res): Promise<void> => {
  const markets = await db.select().from(marketsTable);
  const slots = await db.select().from(slotsTable);
  const vendors = await db.select({ id: vendorsTable.id }).from(vendorsTable).where(eq(vendorsTable.status, "ACTIVE"));

  const totalSlots = slots.length;
  const occupiedSlots = slots.filter(s => s.status === "OCCUPIED").length;
  const availableSlots = slots.filter(s => s.status === "AVAILABLE").length;
  const maintenanceSlots = slots.filter(s => s.status === "UNDER_MAINTENANCE").length;
  const occupancyRate = totalSlots > 0 ? (occupiedSlots / totalSlots) * 100 : 0;

  const paidPayments = await db.select({ total: sum(paymentsTable.amount) }).from(paymentsTable).where(eq(paymentsTable.status, "PAID"));
  const totalRevenue = parseFloat(paidPayments[0]?.total ?? "0");

  const expenses = await db.select({ total: sum(expensesTable.amount) }).from(expensesTable);
  const totalExpenses = parseFloat(expenses[0]?.total ?? "0");

  const overduePaymentsData = await db.select().from(paymentsTable).where(eq(paymentsTable.status, "OVERDUE"));
  const overdueAmount = overduePaymentsData.reduce((acc, p) => acc + parseFloat(p.amount), 0);

  const recentPaymentsRaw = await db.select().from(paymentsTable).orderBy(desc(paymentsTable.createdAt)).limit(5);
  const recentPayments = await Promise.all(recentPaymentsRaw.map(async p => {
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
  }));

  const marketBreakdown = await Promise.all(markets.map(async m => {
    const marketSlots = slots.filter(s => s.marketId === m.id);
    const occupiedCount = marketSlots.filter(s => s.status === "OCCUPIED").length;

    const marketPaidPayments = await db.select({ total: sum(paymentsTable.amount) }).from(paymentsTable)
      .where(and(eq(paymentsTable.marketId, m.id), eq(paymentsTable.status, "PAID")));
    const revenue = parseFloat(marketPaidPayments[0]?.total ?? "0");

    const marketExpenses = await db.select({ total: sum(expensesTable.amount) }).from(expensesTable)
      .where(eq(expensesTable.marketId, m.id));
    const expenseTotal = parseFloat(marketExpenses[0]?.total ?? "0");

    const marketOverdue = await db.select({ cnt: count() }).from(paymentsTable)
      .where(and(eq(paymentsTable.marketId, m.id), eq(paymentsTable.status, "OVERDUE")));

    return {
      marketId: m.id,
      marketName: m.name,
      totalSlots: marketSlots.length,
      occupiedSlots: occupiedCount,
      revenue,
      expenses: expenseTotal,
      overduePayments: marketOverdue[0]?.cnt ?? 0,
    };
  }));

  res.json({
    totalMarkets: markets.length,
    totalSlots,
    occupiedSlots,
    availableSlots,
    maintenanceSlots,
    occupancyRate,
    totalVendors: vendors.length,
    totalRevenue,
    totalExpenses,
    overduePayments: overduePaymentsData.length,
    overdueAmount,
    recentPayments,
    marketBreakdown,
  });
});

router.get("/dashboard/market/:marketId", requireAuth, async (req, res): Promise<void> => {
  const params = GetMarketDashboardParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const { marketId } = params.data;

  const [market] = await db.select().from(marketsTable).where(eq(marketsTable.id, marketId));
  if (!market) {
    res.status(404).json({ error: "Market not found" });
    return;
  }

  const slots = await db.select().from(slotsTable).where(eq(slotsTable.marketId, marketId));
  const totalSlots = slots.length;
  const occupiedSlots = slots.filter(s => s.status === "OCCUPIED").length;
  const availableSlots = slots.filter(s => s.status === "AVAILABLE").length;
  const maintenanceSlots = slots.filter(s => s.status === "UNDER_MAINTENANCE").length;
  const reservedSlots = slots.filter(s => s.status === "RESERVED").length;
  const occupancyRate = totalSlots > 0 ? (occupiedSlots / totalSlots) * 100 : 0;

  const activeVendors = await db.select({ id: vendorsTable.id }).from(vendorsTable)
    .where(and(eq(vendorsTable.marketId, marketId), eq(vendorsTable.status, "ACTIVE")));

  const paidPayments = await db.select({ total: sum(paymentsTable.amount) }).from(paymentsTable)
    .where(and(eq(paymentsTable.marketId, marketId), eq(paymentsTable.status, "PAID")));
  const monthlyRevenue = parseFloat(paidPayments[0]?.total ?? "0");

  const expenses = await db.select({ total: sum(expensesTable.amount) }).from(expensesTable)
    .where(eq(expensesTable.marketId, marketId));
  const totalExpenses = parseFloat(expenses[0]?.total ?? "0");

  const overduePaymentsData = await db.select().from(paymentsTable)
    .where(and(eq(paymentsTable.marketId, marketId), eq(paymentsTable.status, "OVERDUE")));
  const overdueAmount = overduePaymentsData.reduce((acc, p) => acc + parseFloat(p.amount), 0);

  const recentPaymentsRaw = await db.select().from(paymentsTable)
    .where(eq(paymentsTable.marketId, marketId)).orderBy(desc(paymentsTable.createdAt)).limit(5);
  const recentPayments = await Promise.all(recentPaymentsRaw.map(async p => {
    const [vendor] = await db.select({ name: vendorsTable.name }).from(vendorsTable).where(eq(vendorsTable.id, p.vendorId));
    const [slot] = await db.select({ slotNumber: slotsTable.slotNumber }).from(slotsTable).where(eq(slotsTable.id, p.slotId));
    return {
      ...p,
      amount: parseFloat(p.amount),
      vendorName: vendor?.name ?? null,
      slotNumber: slot?.slotNumber ?? null,
      marketName: market.name,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    };
  }));

  const recentNotificationsRaw = await db.select().from(notificationsTable)
    .where(eq(notificationsTable.marketId, marketId)).orderBy(desc(notificationsTable.createdAt)).limit(5);
  const recentNotifications = await Promise.all(recentNotificationsRaw.map(async n => {
    let vendorName: string | null = null;
    if (n.vendorId) {
      const [vendor] = await db.select({ name: vendorsTable.name }).from(vendorsTable).where(eq(vendorsTable.id, n.vendorId));
      vendorName = vendor?.name ?? null;
    }
    return { ...n, vendorName, createdAt: n.createdAt.toISOString() };
  }));

  res.json({
    market: {
      ...market,
      createdAt: market.createdAt.toISOString(),
      updatedAt: market.updatedAt.toISOString(),
    },
    totalSlots,
    occupiedSlots,
    availableSlots,
    maintenanceSlots,
    reservedSlots,
    occupancyRate,
    totalVendors: activeVendors.length,
    monthlyRevenue,
    totalExpenses,
    overduePayments: overduePaymentsData.length,
    overdueAmount,
    recentPayments,
    recentNotifications,
  });
});

export default router;
