import { Response } from "express";
import { prisma } from "../config/prisma";
import { AuthRequest } from "../middlewares/auth.middleware";

const INCLUDE_PRODUCTO = {
  categoria: { select: { id: true, nombre: true, activo: true } },
  proveedor: { select: { id: true, nombre: true, activo: true } },
};

interface DatosProducto {
  nombre: string;
  descripcion: string | null;
  ubicacion: string | null;
  precioCompra: number;
  precioVenta: number;
  stockMinimo: number;
  categoriaId: number;
  proveedorId: number | null;
}

type ResultadoValidacion =
  | { ok: true; datos: DatosProducto }
  | { ok: false; status: number; error: string; productoId?: number };

function parseId(value: unknown): number | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function textoOpcional(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const limpio = String(value).trim();
  return limpio ? limpio : null;
}

function parseDinero(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  const numero = Number(value);
  if (!Number.isFinite(numero) || numero < 0) return null;
  return Math.round(numero * 100) / 100;
}

function parseEnteroNoNegativo(value: unknown): number | null {
  const numero = Number(value);
  return Number.isInteger(numero) && numero >= 0 ? numero : null;
}

function vieneValor(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function conStockBajo<T extends { stockActual: number; stockMinimo: number }>(producto: T) {
  return { ...producto, stockBajo: producto.stockActual <= producto.stockMinimo };
}

async function validarProducto(body: any, usuarioId: number, excluirId?: number): Promise<ResultadoValidacion> {
  const nombre = textoOpcional(body.nombre);

  if (!nombre) {
    return { ok: false, status: 400, error: "El nombre es obligatorio" };
  }

  const precioVenta = parseDinero(body.precioVenta);

  if (precioVenta === null) {
    return { ok: false, status: 400, error: "El precio de venta es obligatorio y no puede ser negativo" };
  }

  let precioCompra = 0;

  if (vieneValor(body.precioCompra)) {
    const valor = parseDinero(body.precioCompra);

    if (valor === null) {
      return { ok: false, status: 400, error: "El precio de compra no puede ser negativo" };
    }

    precioCompra = valor;
  }

  let stockMinimo = 0;

  if (vieneValor(body.stockMinimo)) {
    const valor = parseEnteroNoNegativo(body.stockMinimo);

    if (valor === null) {
      return { ok: false, status: 400, error: "El stock mínimo debe ser un número entero de 0 en adelante" };
    }

    stockMinimo = valor;
  }

  const categoriaId = parseId(body.categoriaId);

  if (!categoriaId) {
    return { ok: false, status: 400, error: "La categoría es obligatoria" };
  }

  const categoria = await prisma.categoria.findFirst({ where: { id: categoriaId, usuarioId } });

  if (!categoria) {
    return { ok: false, status: 404, error: "La categoría no existe" };
  }

  if (!categoria.activo) {
    return { ok: false, status: 409, error: `La categoría "${categoria.nombre}" está desactivada` };
  }

  let proveedorId: number | null = null;

  if (vieneValor(body.proveedorId)) {
    proveedorId = parseId(body.proveedorId);

    if (!proveedorId) {
      return { ok: false, status: 400, error: "Id de proveedor inválido" };
    }

    const proveedor = await prisma.proveedor.findFirst({ where: { id: proveedorId, usuarioId } });

    if (!proveedor) {
      return { ok: false, status: 404, error: "El proveedor no existe" };
    }

    if (!proveedor.activo) {
      return { ok: false, status: 409, error: `El proveedor "${proveedor.nombre}" está desactivado` };
    }
  }

  const repetido = await prisma.producto.findFirst({
    where: {
      usuarioId,
      nombre: { equals: nombre, mode: "insensitive" },
      ...(excluirId ? { NOT: { id: excluirId } } : {}),
    },
  });

  if (repetido) {
    if (!repetido.activo) {
      return {
        ok: false,
        status: 409,
        error: `Ya tienes un producto desactivado llamado "${repetido.nombre}". Reactívalo en lugar de crear otro`,
        productoId: repetido.id,
      };
    }

    return { ok: false, status: 409, error: `Ya tienes un producto llamado "${repetido.nombre}"` };
  }

  return {
    ok: true,
    datos: {
      nombre,
      descripcion: textoOpcional(body.descripcion),
      ubicacion: textoOpcional(body.ubicacion),
      precioCompra,
      precioVenta,
      stockMinimo,
      categoriaId,
      proveedorId,
    },
  };
}

function advertenciaPrecio(datos: DatosProducto): string | undefined {
  if (datos.precioCompra > 0 && datos.precioVenta < datos.precioCompra) {
    return "Ojo: el precio de venta es menor al de compra, vas a perder dinero con este producto";
  }
  return undefined;
}

export async function listarProductos(req: AuthRequest, res: Response) {
  try {
    const usuarioId = req.user!.userId;
    const q = textoOpcional(req.query.q);
    const categoriaId = parseId(req.query.categoriaId);
    const proveedorId = parseId(req.query.proveedorId);
    const stockBajo = req.query.stockBajo === "true";
    const todos = req.query.todos === "true";

    const productos = await prisma.producto.findMany({
      where: {
        usuarioId,
        ...(todos ? {} : { activo: true }),
        ...(categoriaId ? { categoriaId } : {}),
        ...(proveedorId ? { proveedorId } : {}),
        ...(stockBajo ? { stockActual: { lte: prisma.producto.fields.stockMinimo } } : {}),
        ...(q ? { nombre: { contains: q, mode: "insensitive" as const } } : {}),
      },
      include: INCLUDE_PRODUCTO,
      orderBy: { nombre: "asc" },
    });

    return res.status(200).json({ productos: productos.map(conStockBajo) });
  } catch (error) {
    console.error("Error en listarProductos:", error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
}

export async function obtenerProducto(req: AuthRequest, res: Response) {
  try {
    const usuarioId = req.user!.userId;
    const id = parseId(req.params.id);

    if (!id) {
      return res.status(400).json({ error: "Id inválido" });
    }

    const producto = await prisma.producto.findFirst({
      where: { id, usuarioId },
      include: { ...INCLUDE_PRODUCTO, _count: { select: { movimientos: true } } },
    });

    if (!producto) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    return res.status(200).json({ producto: conStockBajo(producto) });
  } catch (error) {
    console.error("Error en obtenerProducto:", error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
}

export async function crearProducto(req: AuthRequest, res: Response) {
  try {
    const usuarioId = req.user!.userId;
    const validacion = await validarProducto(req.body, usuarioId);

    if (!validacion.ok) {
      return res.status(validacion.status).json({
        error: validacion.error,
        ...(validacion.productoId ? { productoId: validacion.productoId } : {}),
      });
    }

    const datos = validacion.datos;

    let stockInicial = 0;

    if (vieneValor(req.body.stockInicial)) {
      const valor = parseEnteroNoNegativo(req.body.stockInicial);

      if (valor === null) {
        return res.status(400).json({ error: "El stock inicial debe ser un número entero de 0 en adelante" });
      }

      stockInicial = valor;
    }

    const producto = await prisma.$transaction(async (tx) => {
      const nuevo = await tx.producto.create({
        data: { ...datos, usuarioId, stockActual: stockInicial },
      });

      if (stockInicial > 0) {
        await tx.movimiento.create({
          data: {
            tipo: "ENTRADA",
            motivo: "AJUSTE",
            cantidad: stockInicial,
            stockResultante: stockInicial,
            precioUnitario: datos.precioCompra,
            nota: "Stock inicial al registrar el producto",
            productoId: nuevo.id,
            usuarioId,
          },
        });
      }

      return tx.producto.findUniqueOrThrow({
        where: { id: nuevo.id },
        include: INCLUDE_PRODUCTO,
      });
    });

    return res.status(201).json({
      message: "Producto creado correctamente",
      producto: conStockBajo(producto),
      advertencia: advertenciaPrecio(datos),
    });
  } catch (error) {
    console.error("Error en crearProducto:", error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
}

export async function actualizarProducto(req: AuthRequest, res: Response) {
  try {
    const usuarioId = req.user!.userId;
    const id = parseId(req.params.id);

    if (!id) {
      return res.status(400).json({ error: "Id inválido" });
    }

    const existente = await prisma.producto.findFirst({ where: { id, usuarioId } });

    if (!existente) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    const validacion = await validarProducto(req.body, usuarioId, id);

    if (!validacion.ok) {
      return res.status(validacion.status).json({ error: validacion.error });
    }

    const datos = validacion.datos;

    const producto = await prisma.producto.update({
      where: { id },
      data: datos,
      include: INCLUDE_PRODUCTO,
    });

    return res.status(200).json({
      message: "Producto actualizado correctamente",
      producto: conStockBajo(producto),
      advertencia: advertenciaPrecio(datos),
    });
  } catch (error) {
    console.error("Error en actualizarProducto:", error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
}

export async function cambiarEstadoProducto(req: AuthRequest, res: Response) {
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

    const producto = await prisma.producto.findFirst({
      where: { id, usuarioId },
      include: INCLUDE_PRODUCTO,
    });

    if (!producto) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    if (activo) {
      if (!producto.categoria.activo) {
        return res.status(409).json({
          error: `No se puede reactivar: la categoría "${producto.categoria.nombre}" está desactivada`,
        });
      }

      if (producto.proveedor && !producto.proveedor.activo) {
        return res.status(409).json({
          error: `No se puede reactivar: el proveedor "${producto.proveedor.nombre}" está desactivado`,
        });
      }
    }

    const actualizado = await prisma.producto.update({
      where: { id },
      data: { activo },
      include: INCLUDE_PRODUCTO,
    });

    return res.status(200).json({
      message: activo ? "Producto reactivado" : "Producto desactivado",
      producto: conStockBajo(actualizado),
    });
  } catch (error) {
    console.error("Error en cambiarEstadoProducto:", error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
}

export async function eliminarProducto(req: AuthRequest, res: Response) {
  try {
    const usuarioId = req.user!.userId;
    const id = parseId(req.params.id);

    if (!id) {
      return res.status(400).json({ error: "Id inválido" });
    }

    const producto = await prisma.producto.findFirst({
      where: { id, usuarioId },
      include: { _count: { select: { movimientos: true } } },
    });

    if (!producto) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    if (producto._count.movimientos > 0) {
      return res.status(409).json({
        error: "No se puede eliminar porque ya tiene movimientos en el historial. Desactívalo en su lugar",
      });
    }

    await prisma.producto.delete({ where: { id } });

    return res.status(200).json({ message: "Producto eliminado correctamente" });
  } catch (error) {
    console.error("Error en eliminarProducto:", error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
}