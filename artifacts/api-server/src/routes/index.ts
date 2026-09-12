import { Router, type IRouter } from "express";
import healthRouter from "./health";
import rollRouter from "./roll";
import storageRouter from "./storage";

const router: IRouter = Router();

router.use(healthRouter);
router.use(rollRouter);
router.use(storageRouter);

export default router;
