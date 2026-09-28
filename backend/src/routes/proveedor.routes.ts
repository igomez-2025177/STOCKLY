import { Router } from "express";
import {
  listarProveedores,
  obtenerProveedor,
  crearProveedor,
  actualizarProveedor,
  cambiarEstadoProveedor,
  eliminarProveedor,
} from "../controllers/proveedor.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

router.use(authMiddleware);

router.get("/", listarProveedores);
router.get("/:id", obtenerProveedor);
router.post("/", crearProveedor);
router.put("/:id", actualizarProveedor);
router.patch("/:id/estado", cambiarEstadoProveedor);
router.delete("/:id", eliminarProveedor);

export default router;