import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import marketsRouter from "./markets";
import slotsRouter from "./slots";
import vendorsRouter from "./vendors";
import paymentsRouter from "./payments";
import expensesRouter from "./expenses";
import notificationsRouter from "./notifications";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(marketsRouter);
router.use(slotsRouter);
router.use(vendorsRouter);
router.use(paymentsRouter);
router.use(expensesRouter);
router.use(notificationsRouter);
router.use(dashboardRouter);

export default router;
