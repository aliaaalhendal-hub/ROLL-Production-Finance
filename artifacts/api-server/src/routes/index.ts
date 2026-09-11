import { Router, type IRouter } from "express";
import healthRouter from "./health";
import rollRouter from "./roll";

const router: IRouter = Router();

router.use(healthRouter);
router.use(rollRouter);

export default router;
