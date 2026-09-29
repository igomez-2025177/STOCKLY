import { Router } from "express";
import {
  listarCategorias,
  obtenerCategoria,
  crearCategoria,
  actualizarCategoria,
  cambiarEstadoCategoria,
  eliminarCategoria,
} from "../controllers/categoria.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

router.use(authMiddleware);

router.get("/", listarCategorias);
router.get("/:id", obtenerCategoria);
router.post("/", crearCategoria);
router.put("/:id", actualizarCategoria);
router.patch("/:id/estado", cambiarEstadoCategoria);
router.delete("/:id", eliminarCategoria);

export default router;