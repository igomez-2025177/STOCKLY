import { Router } from "express";
import { obtenerDashboard } from "../controllers/dashboard.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

router.get("/", authMiddleware, obtenerDashboard);

export default router;