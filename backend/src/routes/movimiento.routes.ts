import { Router } from "express";
import {
  registrarMovimiento,
  listarMovimientos,
  obtenerMovimiento,
} from "../controllers/movimiento.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

router.use(authMiddleware);

router.get("/", listarMovimientos);
router.get("/:id", obtenerMovimiento);
router.post("/", registrarMovimiento);

export default router;