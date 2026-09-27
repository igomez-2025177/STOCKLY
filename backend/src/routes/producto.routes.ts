import { Router } from "express";
import {
  listarProductos,
  obtenerProducto,
  crearProducto,
  actualizarProducto,
  cambiarEstadoProducto,
  eliminarProducto,
} from "../controllers/producto.controller";
import { authMiddleware, soloAdmin } from "../middlewares/auth.middleware";

const router = Router();

router.use(authMiddleware);

router.get("/", listarProductos);
router.get("/:id", obtenerProducto);
router.post("/", soloAdmin, crearProducto);
router.put("/:id", soloAdmin, actualizarProducto);
router.patch("/:id/estado", soloAdmin, cambiarEstadoProducto);
router.delete("/:id", soloAdmin, eliminarProducto);

export default router;