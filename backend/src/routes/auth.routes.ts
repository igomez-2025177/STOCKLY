import { Router } from "express";
import { register, login, googleLogin, me, cambiarMiPassword } from "../controllers/auth.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/google", googleLogin);
router.get("/me", authMiddleware, me);
router.patch("/password", authMiddleware, cambiarMiPassword);

export default router;