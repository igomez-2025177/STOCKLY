import { Response } from "express";
import { prisma } from "../config/prisma";
import { AuthRequest } from "../middlewares/auth.middleware";

const TIPOS = ["ENTRADA", "SALIDA"] as const;
const MOTIVOS = ["COMPRA", "VENTA", "PERDIDA", "DEVOLUCION", "AJUSTE"] as const;

type Tipo = (typeof TIPOS)[number];
type Motivo = (typeof MOTIVOS)[number];

// que motivo va con que tipo
const MOTIVOS_POR_TIPO: Record<Tipo, Motivo[]> = {
  ENTRADA: ["COMPRA", "DEVOLUCION", "AJUSTE"],
  SALIDA: ["VENTA", "PERDIDA", "DEVOLUCION", "AJUSTE"],
};

const MOTIVOS_CON_NOTA: Motivo[] = ["PERDIDA", "AJUSTE"];

const INCLUDE_MOVIMIENTO = {
  producto: { select: { id: true, sku: true, nombre: true, unidad: true } },
  usuario: { select: { id: true, nombre: true } },
  proveedor: { select: { id: true, nombre: true } },
};

class ErrorNegocio extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

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

function vieneValor(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function parseFecha(value: unknown, finDelDia: boolean): Date | null {
  const texto = textoOpcional(value);
  if (!texto || !/^\d{4}-\d{2}-\d{2}$/.test(texto)) return null;
  const fecha = new Date(`${texto}T${finDelDia ? "23:59:59.999" : "00:00:00"}`);
  return isNaN(fecha.getTime()) ? null : fecha;
}

export async function registrarMovimiento(req: AuthRequest, res: Response) {
  try {
    const tipo = String(req.body.tipo ?? "").toUpperCase() as Tipo;
    const motivo = String(req.body.motivo ?? "").toUpperCase() as Motivo;

    if (!TIPOS.includes(tipo)) {
      return res.status(400).json({ error: "El tipo debe ser ENTRADA o SALIDA" });
    }

    if (!MOTIVOS.includes(motivo)) {
      return res.status(400).json({ error: `Motivo no válido. Usa: ${MOTIVOS.join(", ")}` });
    }

    if (!MOTIVOS_POR_TIPO[tipo].includes(motivo)) {
      return res.status(400).json({
        error: `Una ${tipo} no puede tener motivo ${motivo}. Para ${tipo} usa: ${MOTIVOS_POR_TIPO[tipo].join(", ")}`,
      });
    }

    const cantidad = Number(req.body.cantidad);

    if (!Number.isInteger(cantidad) || cantidad <= 0) {
      return res.status(400).json({ error: "La cantidad debe ser un número entero mayor a 0" });
    }

    const productoId = parseId(req.body.productoId);

    if (!productoId) {
      return res.status(400).json({ error: "El producto es obligatorio" });
    }

    const nota = textoOpcional(req.body.nota);

    if (MOTIVOS_CON_NOTA.includes(motivo) && !nota) {
      return res.status(400).json({ error: `Para una ${motivo} tienes que explicar qué pasó en la nota` });
    }

    const referencia = textoOpcional(req.body.referencia);

    const aceptaProveedor = motivo === "COMPRA" || (tipo === "SALIDA" && motivo === "DEVOLUCION");
    let proveedorIdBody: number | null = null;

    if (vieneValor(req.body.proveedorId)) {
      if (!aceptaProveedor) {
        return res.status(400).json({
          error: "El proveedor solo se indica en una COMPRA o en una DEVOLUCION al proveedor",
        });
      }

      proveedorIdBody = parseId(req.body.proveedorId);

      if (!proveedorIdBody) {
        return res.status(400).json({ error: "Id de proveedor inválido" });
      }
    }

    let precioBody: number | null = null;

    if (vieneValor(req.body.precioUnitario)) {
      if (motivo !== "COMPRA" && motivo !== "VENTA") {
        return res.status(400).json({ error: "El precio solo se puede indicar en una COMPRA o una VENTA" });
      }

      precioBody = parseDinero(req.body.precioUnitario);

      if (precioBody === null) {
        return res.status(400).json({ error: "El precio no puede ser negativo" });
      }
    }

    const usuarioId = req.user!.userId;

    const resultado = await prisma.$transaction(async (tx) => {
      const producto = await tx.producto.findUnique({ where: { id: productoId } });

      if (!producto) {
        throw new ErrorNegocio(404, "Producto no encontrado");
      }

      if (!producto.activo) {
        throw new ErrorNegocio(409, `El producto "${producto.nombre}" está desactivado`);
      }

      let proveedorId: number | null = null;

      if (aceptaProveedor) {
        proveedorId = proveedorIdBody ?? (motivo === "COMPRA" ? producto.proveedorId : null);
      }

      if (proveedorId) {
        const proveedor = await tx.proveedor.findUnique({ where: { id: proveedorId } });

        if (!proveedor) {
          throw new ErrorNegocio(404, "El proveedor no existe");
        }

        if (!proveedor.activo) {
          throw new ErrorNegocio(409, `El proveedor "${proveedor.nombre}" está desactivado`);
        }
      }

      if (tipo === "SALIDA") {
        const actualizado = await tx.producto.updateMany({
          where: { id: productoId, stockActual: { gte: cantidad } },
          data: { stockActual: { decrement: cantidad } },
        });

        if (actualizado.count === 0) {
          throw new ErrorNegocio(
            409,
            `Stock insuficiente: hay ${producto.stockActual} de "${producto.nombre}" y quieres sacar ${cantidad}`
          );
        }
      } else {
        const cambiaPrecioCompra =
          motivo === "COMPRA" && precioBody !== null && precioBody !== Number(producto.precioCompra);

        await tx.producto.update({
          where: { id: productoId },
          data: {
            stockActual: { increment: cantidad },
            ...(cambiaPrecioCompra ? { precioCompra: precioBody! } : {}),
          },
        });
      }

      const productoFinal = await tx.producto.findUniqueOrThrow({
        where: { id: productoId },
        select: { stockActual: true, stockMinimo: true },
      });

      const precioUnitario = precioBody ?? (motivo === "VENTA" ? producto.precioVenta : producto.precioCompra);

      const movimiento = await tx.movimiento.create({
        data: {
          tipo,
          motivo,
          cantidad,
          stockResultante: productoFinal.stockActual,
          precioUnitario,
          referencia,
          nota,
          productoId,
          usuarioId,
          proveedorId,
        },
        include: INCLUDE_MOVIMIENTO,
      });

      return { movimiento, stockMinimo: productoFinal.stockMinimo };
    });

    const { movimiento, stockMinimo } = resultado;
    let alerta: string | undefined;

    if (movimiento.stockResultante === 0) {
      alerta = `"${movimiento.producto.nombre}" se agotó`;
    } else if (movimiento.stockResultante <= stockMinimo) {
      alerta = `Quedan ${movimiento.stockResultante} de "${movimiento.producto.nombre}", está en o debajo del mínimo (${stockMinimo})`;
    }

    return res.status(201).json({
      message: "Movimiento registrado correctamente",
      movimiento,
      alerta,
    });
  } catch (error) {
    if (error instanceof ErrorNegocio) {
      return res.status(error.status).json({ error: error.message });
    }

    console.error("Error en registrarMovimiento:", error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
}

export async function listarMovimientos(req: AuthRequest, res: Response) {
  try {
    const productoId = parseId(req.query.productoId);
    const usuarioId = parseId(req.query.usuarioId);
    const tipoTexto = textoOpcional(req.query.tipo)?.toUpperCase() ?? null;
    const motivoTexto = textoOpcional(req.query.motivo)?.toUpperCase() ?? null;

    if (tipoTexto && !TIPOS.includes(tipoTexto as Tipo)) {
      return res.status(400).json({ error: "El tipo debe ser ENTRADA o SALIDA" });
    }

    if (motivoTexto && !MOTIVOS.includes(motivoTexto as Motivo)) {
      return res.status(400).json({ error: `Motivo no válido. Usa: ${MOTIVOS.join(", ")}` });
    }

    const tipo = tipoTexto as Tipo | null;
    const motivo = motivoTexto as Motivo | null;

    const desde = vieneValor(req.query.desde) ? parseFecha(req.query.desde, false) : null;
    const hasta = vieneValor(req.query.hasta) ? parseFecha(req.query.hasta, true) : null;

    if ((vieneValor(req.query.desde) && !desde) || (vieneValor(req.query.hasta) && !hasta)) {
      return res.status(400).json({ error: "Las fechas van en formato AAAA-MM-DD" });
    }

    if (desde && hasta && desde > hasta) {
      return res.status(400).json({ error: "La fecha 'desde' no puede ser mayor que 'hasta'" });
    }

    const pagina = Math.max(1, parseInt(String(req.query.pagina ?? "1"), 10) || 1);
    const limite = Math.min(100, Math.max(1, parseInt(String(req.query.limite ?? "20"), 10) || 20));

    const where = {
      ...(productoId ? { productoId } : {}),
      ...(usuarioId ? { usuarioId } : {}),
      ...(tipo ? { tipo } : {}),
      ...(motivo ? { motivo } : {}),
      ...(desde || hasta
        ? {
            fecha: {
              ...(desde ? { gte: desde } : {}),
              ...(hasta ? { lte: hasta } : {}),
            },
          }
        : {}),
    };

    const [total, movimientos] = await prisma.$transaction([
      prisma.movimiento.count({ where }),
      prisma.movimiento.findMany({
        where,
        include: INCLUDE_MOVIMIENTO,
        orderBy: [{ fecha: "desc" }, { id: "desc" }],
        skip: (pagina - 1) * limite,
        take: limite,
      }),
    ]);

    return res.status(200).json({
      movimientos,
      total,
      pagina,
      totalPaginas: Math.ceil(total / limite),
    });
  } catch (error) {
    console.error("Error en listarMovimientos:", error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
}

export async function obtenerMovimiento(req: AuthRequest, res: Response) {
  try {
    const id = parseId(req.params.id);

    if (!id) {
      return res.status(400).json({ error: "Id inválido" });
    }

    const movimiento = await prisma.movimiento.findUnique({
      where: { id },
      include: INCLUDE_MOVIMIENTO,
    });

    if (!movimiento) {
      return res.status(404).json({ error: "Movimiento no encontrado" });
    }

    return res.status(200).json({ movimiento });
  } catch (error) {
    console.error("Error en obtenerMovimiento:", error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
}