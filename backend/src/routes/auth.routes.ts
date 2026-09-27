import { Router } from "express";
import { registroAbierto, register, login, me, cambiarMiPassword } from "../controllers/auth.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

router.get("/registro-abierto", registroAbierto);
router.post("/register", register);
router.post("/login", login);
router.get("/me", authMiddleware, me);
router.patch("/password", authMiddleware, cambiarMiPassword);

export default router;