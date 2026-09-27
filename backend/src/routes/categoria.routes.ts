import { Router } from "express";
import {
  listarCategorias,
  obtenerCategoria,
  crearCategoria,
  actualizarCategoria,
  cambiarEstadoCategoria,
  eliminarCategoria,
} from "../controllers/categoria.controller";
import { authMiddleware, soloAdmin } from "../middlewares/auth.middleware";

const router = Router();

// todas las rutas de aqui piden sesion
router.use(authMiddleware);

router.get("/", listarCategorias);
router.get("/:id", obtenerCategoria);
router.post("/", soloAdmin, crearCategoria);
router.put("/:id", soloAdmin, actualizarCategoria);
router.patch("/:id/estado", soloAdmin, cambiarEstadoCategoria);
router.delete("/:id", soloAdmin, eliminarCategoria);

export default router;