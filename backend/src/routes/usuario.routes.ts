import { Router } from "express";
import {
  listarUsuarios,
  obtenerUsuario,
  crearUsuario,
  actualizarUsuario,
  cambiarEstadoUsuario,
  restablecerPassword,
  eliminarUsuario,
} from "../controllers/usuario.controller";
import { authMiddleware, soloAdmin } from "../middlewares/auth.middleware";

const router = Router();

router.use(authMiddleware, soloAdmin);

router.get("/", listarUsuarios);
router.get("/:id", obtenerUsuario);
router.post("/", crearUsuario);
router.put("/:id", actualizarUsuario);
router.patch("/:id/estado", cambiarEstadoUsuario);
router.patch("/:id/password", restablecerPassword);
router.delete("/:id", eliminarUsuario);

export default router;