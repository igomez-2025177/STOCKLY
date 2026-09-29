import { Response } from "express";
import { prisma } from "../config/prisma";
import { AuthRequest } from "../middlewares/auth.middleware";

function parseId(value: unknown): number | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function textoOpcional(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const limpio = String(value).trim();
  return limpio ? limpio : null;
}

const REGEX_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REGEX_TELEFONO = /^[0-9+\-\s]{8,15}$/;
const REGEX_NIT = /^([0-9]+-?[0-9kK]|CF)$/i;

function validarDatos(correo: string | null, telefono: string | null, nit: string | null): string | null {
  if (correo && !REGEX_CORREO.test(correo)) {
    return "El correo no tiene un formato válido";
  }

  if (telefono && !REGEX_TELEFONO.test(telefono)) {
    return "El teléfono debe tener entre 8 y 15 caracteres (solo números, espacios, + o -)";
  }

  if (nit && !REGEX_NIT.test(nit)) {
    return "El NIT no es válido (ejemplo: 1234567-8, 1234567K o CF)";
  }

  return null;
}

async function buscarPorNombre(usuarioId: number, nombre: string, excluirId?: number) {
  return prisma.proveedor.findFirst({
    where: {
      usuarioId,
      nombre: { equals: nombre, mode: "insensitive" },
      ...(excluirId ? { NOT: { id: excluirId } } : {}),
    },
  });
}

async function buscarPropio(usuarioId: number, id: number) {
  return prisma.proveedor.findFirst({ where: { id, usuarioId } });
}

export async function listarProveedores(req: AuthRequest, res: Response) {
  try {
    const usuarioId = req.user!.userId;
    const todos = req.query.todos === "true";

    const proveedores = await prisma.proveedor.findMany({
      where: { usuarioId, ...(todos ? {} : { activo: true }) },
      orderBy: { nombre: "asc" },
      include: { _count: { select: { productos: true } } },
    });

    return res.status(200).json({ proveedores });
  } catch (error) {
    console.error("Error en listarProveedores:", error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
}

export async function obtenerProveedor(req: AuthRequest, res: Response) {
  try {
    const usuarioId = req.user!.userId;
    const id = parseId(req.params.id);

    if (!id) {
      return res.status(400).json({ error: "Id inválido" });
    }

    const proveedor = await prisma.proveedor.findFirst({
      where: { id, usuarioId },
      include: { _count: { select: { productos: true, movimientos: true } } },
    });

    if (!proveedor) {
      return res.status(404).json({ error: "Proveedor no encontrado" });
    }

    return res.status(200).json({ proveedor });
  } catch (error) {
    console.error("Error en obtenerProveedor:", error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
}

export async function crearProveedor(req: AuthRequest, res: Response) {
  try {
    const usuarioId = req.user!.userId;
    const { nombre } = req.body;

    if (!nombre || !String(nombre).trim()) {
      return res.status(400).json({ error: "El nombre es obligatorio" });
    }

    const nombreLimpio = String(nombre).trim();
    const contacto = textoOpcional(req.body.contacto);
    const telefono = textoOpcional(req.body.telefono);
    const correo = textoOpcional(req.body.correo)?.toLowerCase() ?? null;
    const nit = textoOpcional(req.body.nit)?.toUpperCase() ?? null;

    const errorValidacion = validarDatos(correo, telefono, nit);

    if (errorValidacion) {
      return res.status(400).json({ error: errorValidacion });
    }

    const existente = await buscarPorNombre(usuarioId, nombreLimpio);

    if (existente) {
      if (!existente.activo) {
        return res.status(409).json({
          error: `El proveedor "${existente.nombre}" ya existe pero está desactivado. Reactívalo en lugar de crear otro`,
          proveedorId: existente.id,
        });
      }

      return res.status(409).json({ error: `Ya existe el proveedor "${existente.nombre}"` });
    }

    const proveedor = await prisma.proveedor.create({
      data: { nombre: nombreLimpio, contacto, telefono, correo, nit, usuarioId },
    });

    return res.status(201).json({ message: "Proveedor creado correctamente", proveedor });
  } catch (error) {
    console.error("Error en crearProveedor:", error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
}

export async function actualizarProveedor(req: AuthRequest, res: Response) {
  try {
    const usuarioId = req.user!.userId;
    const id = parseId(req.params.id);

    if (!id) {
      return res.status(400).json({ error: "Id inválido" });
    }

    const { nombre } = req.body;

    if (!nombre || !String(nombre).trim()) {
      return res.status(400).json({ error: "El nombre es obligatorio" });
    }

    const proveedor = await buscarPropio(usuarioId, id);

    if (!proveedor) {
      return res.status(404).json({ error: "Proveedor no encontrado" });
    }

    const nombreLimpio = String(nombre).trim();
    const contacto = textoOpcional(req.body.contacto);
    const telefono = textoOpcional(req.body.telefono);
    const correo = textoOpcional(req.body.correo)?.toLowerCase() ?? null;
    const nit = textoOpcional(req.body.nit)?.toUpperCase() ?? null;

    const errorValidacion = validarDatos(correo, telefono, nit);

    if (errorValidacion) {
      return res.status(400).json({ error: errorValidacion });
    }

    const repetido = await buscarPorNombre(usuarioId, nombreLimpio, id);

    if (repetido) {
      return res.status(409).json({ error: `Ya existe otro proveedor llamado "${repetido.nombre}"` });
    }

    const actualizado = await prisma.proveedor.update({
      where: { id },
      data: { nombre: nombreLimpio, contacto, telefono, correo, nit },
    });

    return res.status(200).json({ message: "Proveedor actualizado correctamente", proveedor: actualizado });
  } catch (error) {
    console.error("Error en actualizarProveedor:", error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
}

export async function cambiarEstadoProveedor(req: AuthRequest, res: Response) {
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

    const proveedor = await buscarPropio(usuarioId, id);

    if (!proveedor) {
      return res.status(404).json({ error: "Proveedor no encontrado" });
    }

    if (!activo) {
      const productosActivos = await prisma.producto.count({
        where: { proveedorId: id, activo: true },
      });

      if (productosActivos > 0) {
        return res.status(409).json({
          error: `No se puede desactivar: surte ${productosActivos} producto(s) activo(s). Cámbiales el proveedor o desactívalos primero`,
        });
      }
    }

    const actualizado = await prisma.proveedor.update({
      where: { id },
      data: { activo },
    });

    return res.status(200).json({
      message: activo ? "Proveedor reactivado" : "Proveedor desactivado",
      proveedor: actualizado,
    });
  } catch (error) {
    console.error("Error en cambiarEstadoProveedor:", error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
}

export async function eliminarProveedor(req: AuthRequest, res: Response) {
  try {
    const usuarioId = req.user!.userId;
    const id = parseId(req.params.id);

    if (!id) {
      return res.status(400).json({ error: "Id inválido" });
    }

    const proveedor = await prisma.proveedor.findFirst({
      where: { id, usuarioId },
      include: { _count: { select: { productos: true, movimientos: true } } },
    });

    if (!proveedor) {
      return res.status(404).json({ error: "Proveedor no encontrado" });
    }

    if (proveedor._count.productos > 0 || proveedor._count.movimientos > 0) {
      return res.status(409).json({
        error: "No se puede eliminar porque tiene productos o movimientos registrados. Desactívalo en su lugar",
      });
    }

    await prisma.proveedor.delete({ where: { id } });

    return res.status(200).json({ message: "Proveedor eliminado correctamente" });
  } catch (error) {
    console.error("Error en eliminarProveedor:", error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
}