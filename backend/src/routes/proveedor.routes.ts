import { Router } from "express";
import {
  listarProveedores,
  obtenerProveedor,
  crearProveedor,
  actualizarProveedor,
  cambiarEstadoProveedor,
  eliminarProveedor,
} from "../controllers/proveedor.controller";
import { authMiddleware, soloAdmin } from "../middlewares/auth.middleware";

const router = Router();

router.use(authMiddleware);

router.get("/", listarProveedores);
router.get("/:id", obtenerProveedor);
router.post("/", soloAdmin, crearProveedor);
router.put("/:id", soloAdmin, actualizarProveedor);
router.patch("/:id/estado", soloAdmin, cambiarEstadoProveedor);
router.delete("/:id", soloAdmin, eliminarProveedor);

export default router;