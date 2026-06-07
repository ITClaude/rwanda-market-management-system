import { Router, type IRouter } from "express";
import { eq, and, type SQL } from "drizzle-orm";
import { db, expensesTable, marketsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import {
  CreateExpenseBody,
  DeleteExpenseParams,
  ListExpensesQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/expenses", requireAuth, async (req, res): Promise<void> => {
  const params = ListExpensesQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const conditions: SQL[] = [];
  if (params.data.marketId != null) conditions.push(eq(expensesTable.marketId, params.data.marketId));
  if (params.data.category != null) conditions.push(eq(expensesTable.category, params.data.category));

  const expenses = conditions.length
    ? await db.select().from(expensesTable).where(and(...conditions)).orderBy(expensesTable.expenseDate)
    : await db.select().from(expensesTable).orderBy(expensesTable.expenseDate);

  const marketIds = [...new Set(expenses.map(e => e.marketId))];
  const markets = marketIds.length
    ? await db.select({ id: marketsTable.id, name: marketsTable.name }).from(marketsTable)
    : [];
  const marketMap = new Map(markets.map(m => [m.id, m.name]));

  res.json(expenses.map(e => ({
    ...e,
    amount: parseFloat(e.amount),
    marketName: marketMap.get(e.marketId) ?? null,
    createdAt: e.createdAt.toISOString(),
  })));
});

router.post("/expenses", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateExpenseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [expense] = await db.insert(expensesTable).values({
    ...parsed.data,
    amount: String(parsed.data.amount),
  }).returning();

  const [market] = await db.select({ name: marketsTable.name }).from(marketsTable).where(eq(marketsTable.id, expense.marketId));

  res.status(201).json({
    ...expense,
    amount: parseFloat(expense.amount),
    marketName: market?.name ?? null,
    createdAt: expense.createdAt.toISOString(),
  });
});

router.delete("/expenses/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteExpenseParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [expense] = await db.delete(expensesTable).where(eq(expensesTable.id, params.data.id)).returning();
  if (!expense) {
    res.status(404).json({ error: "Expense not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
