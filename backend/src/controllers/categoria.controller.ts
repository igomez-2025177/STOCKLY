import { Response } from "express";
import { prisma } from "../config/prisma";
import { AuthRequest } from "../middlewares/auth.middleware";

function parseId(value: unknown): number | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

async function buscarPorNombre(usuarioId: number, nombre: string, excluirId?: number) {
  return prisma.categoria.findFirst({
    where: {
      usuarioId,
      nombre: { equals: nombre, mode: "insensitive" },
      ...(excluirId ? { NOT: { id: excluirId } } : {}),
    },
  });
}

async function buscarPropia(usuarioId: number, id: number) {
  return prisma.categoria.findFirst({ where: { id, usuarioId } });
}

export async function listarCategorias(req: AuthRequest, res: Response) {
  try {
    const usuarioId = req.user!.userId;
    const todas = req.query.todas === "true";

    const categorias = await prisma.categoria.findMany({
      where: { usuarioId, ...(todas ? {} : { activo: true }) },
      orderBy: { nombre: "asc" },
      include: { _count: { select: { productos: true } } },
    });

    return res.status(200).json({ categorias });
  } catch (error) {
    console.error("Error en listarCategorias:", error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
}

export async function obtenerCategoria(req: AuthRequest, res: Response) {
  try {
    const usuarioId = req.user!.userId;
    const id = parseId(req.params.id);

    if (!id) {
      return res.status(400).json({ error: "Id inválido" });
    }

    const categoria = await prisma.categoria.findFirst({
      where: { id, usuarioId },
      include: { _count: { select: { productos: true } } },
    });

    if (!categoria) {
      return res.status(404).json({ error: "Categoría no encontrada" });
    }

    return res.status(200).json({ categoria });
  } catch (error) {
    console.error("Error en obtenerCategoria:", error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
}

export async function crearCategoria(req: AuthRequest, res: Response) {
  try {
    const usuarioId = req.user!.userId;
    const { nombre, descripcion } = req.body;

    if (!nombre || !String(nombre).trim()) {
      return res.status(400).json({ error: "El nombre es obligatorio" });
    }

    const nombreLimpio = String(nombre).trim();
    const existente = await buscarPorNombre(usuarioId, nombreLimpio);

    if (existente) {
      if (!existente.activo) {
        return res.status(409).json({
          error: `La categoría "${existente.nombre}" ya existe pero está desactivada. Reactívala en lugar de crear otra`,
          categoriaId: existente.id,
        });
      }

      return res.status(409).json({ error: `Ya existe la categoría "${existente.nombre}"` });
    }

    const categoria = await prisma.categoria.create({
      data: {
        nombre: nombreLimpio,
        descripcion: descripcion ? String(descripcion).trim() : null,
        usuarioId,
      },
    });

    return res.status(201).json({ message: "Categoría creada correctamente", categoria });
  } catch (error) {
    console.error("Error en crearCategoria:", error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
}

export async function actualizarCategoria(req: AuthRequest, res: Response) {
  try {
    const usuarioId = req.user!.userId;
    const id = parseId(req.params.id);

    if (!id) {
      return res.status(400).json({ error: "Id inválido" });
    }

    const { nombre, descripcion } = req.body;

    if (!nombre || !String(nombre).trim()) {
      return res.status(400).json({ error: "El nombre es obligatorio" });
    }

    const categoria = await buscarPropia(usuarioId, id);

    if (!categoria) {
      return res.status(404).json({ error: "Categoría no encontrada" });
    }

    const nombreLimpio = String(nombre).trim();
    const repetida = await buscarPorNombre(usuarioId, nombreLimpio, id);

    if (repetida) {
      return res.status(409).json({ error: `Ya existe otra categoría llamada "${repetida.nombre}"` });
    }

    const actualizada = await prisma.categoria.update({
      where: { id },
      data: {
        nombre: nombreLimpio,
        descripcion: descripcion ? String(descripcion).trim() : null,
      },
    });

    return res.status(200).json({ message: "Categoría actualizada correctamente", categoria: actualizada });
  } catch (error) {
    console.error("Error en actualizarCategoria:", error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
}

export async function cambiarEstadoCategoria(req: AuthRequest, res: Response) {
  try {
    const usuarioId = req.user!.userId;
    const id = parseId(req.params.id);

    if (!id) {
      return res.status(400).json({ error: "Id inválido" });
    }

    const { activo } = req.body;

    if (typeof activo !== "boolean") {
      return res.status(400).json({ error: "El campo activo debe ser true o false" });
    }

    const categoria = await buscarPropia(usuarioId, id);

    if (!categoria) {
      return res.status(404).json({ error: "Categoría no encontrada" });
    }

    if (!activo) {
      const productosActivos = await prisma.producto.count({
        where: { categoriaId: id, activo: true },
      });

      if (productosActivos > 0) {
        return res.status(409).json({
          error: `No se puede desactivar: tiene ${productosActivos} producto(s) activo(s). Muévelos o desactívalos primero`,
        });
      }
    }

    const actualizada = await prisma.categoria.update({
      where: { id },
      data: { activo },
    });

    return res.status(200).json({
      message: activo ? "Categoría reactivada" : "Categoría desactivada",
      categoria: actualizada,
    });
  } catch (error) {
    console.error("Error en cambiarEstadoCategoria:", error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
}

export async function eliminarCategoria(req: AuthRequest, res: Response) {
  try {
    const usuarioId = req.user!.userId;
    const id = parseId(req.params.id);

    if (!id) {
      return res.status(400).json({ error: "Id inválido" });
    }

    const categoria = await prisma.categoria.findFirst({
      where: { id, usuarioId },
      include: { _count: { select: { productos: true } } },
    });

    if (!categoria) {
      return res.status(404).json({ error: "Categoría no encontrada" });
    }

    if (categoria._count.productos > 0) {
      return res.status(409).json({
        error: "No se puede eliminar porque tiene productos asignados. Desactívala en su lugar",
      });
    }

    await prisma.categoria.delete({ where: { id } });

    return res.status(200).json({ message: "Categoría eliminada correctamente" });
  } catch (error) {
    console.error("Error en eliminarCategoria:", error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
}