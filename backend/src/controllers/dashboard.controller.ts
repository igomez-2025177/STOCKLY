import { Response } from "express";
import { prisma } from "../config/prisma";
import { AuthRequest } from "../middlewares/auth.middleware";

const INCLUDE_MOVIMIENTO = {
  producto: { select: { id: true, nombre: true } },
  usuario: { select: { id: true, nombre: true } },
  proveedor: { select: { id: true, nombre: true } },
};

function redondear(valor: number): number {
  return Math.round(valor * 100) / 100;
}

export async function obtenerDashboard(req: AuthRequest, res: Response) {
  try {
    const usuarioId = req.user!.userId;

    const ahora = new Date();
    const inicioHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
    const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);

    const [productos, totalCategorias, totalProveedores, movimientosHoy, ultimosMovimientos, masVendidos, movimientosMes] =
      await Promise.all([
        prisma.producto.findMany({
          where: { usuarioId, activo: true },
          select: {
            id: true,
            nombre: true,
            stockActual: true,
            stockMinimo: true,
            precioCompra: true,
            precioVenta: true,
            categoria: { select: { id: true, nombre: true } },
          },
        }),
        prisma.categoria.count({ where: { usuarioId, activo: true } }),
        prisma.proveedor.count({ where: { usuarioId, activo: true } }),
        prisma.movimiento.findMany({
          where: { usuarioId, fecha: { gte: inicioHoy } },
          select: { tipo: true, cantidad: true },
        }),
        prisma.movimiento.findMany({
          where: { usuarioId },
          include: INCLUDE_MOVIMIENTO,
          orderBy: [{ fecha: "desc" }, { id: "desc" }],
          take: 10,
        }),
        prisma.movimiento.groupBy({
          by: ["productoId"],
          where: { usuarioId, motivo: "VENTA", fecha: { gte: inicioMes } },
          _sum: { cantidad: true },
          orderBy: { _sum: { cantidad: "desc" } },
          take: 5,
        }),
        prisma.movimiento.findMany({
          where: {
            usuarioId,
            fecha: { gte: inicioMes },
            motivo: { in: ["VENTA", "COMPRA", "PERDIDA"] },
          },
          select: { motivo: true, cantidad: true, precioUnitario: true },
        }),
      ]);

    const listaStockBajo = productos
      .filter((p) => p.stockActual <= p.stockMinimo)
      .sort((a, b) => a.stockActual - b.stockActual)
      .map((p) => ({
        id: p.id,
        nombre: p.nombre,
        stockActual: p.stockActual,
        stockMinimo: p.stockMinimo,
        faltan: p.stockMinimo - p.stockActual,
        categoria: p.categoria,
      }));

    const agotados = productos.filter((p) => p.stockActual === 0).length;

    const hoy = { entradas: 0, unidadesEntrada: 0, salidas: 0, unidadesSalida: 0 };

    for (const m of movimientosHoy) {
      if (m.tipo === "ENTRADA") {
        hoy.entradas++;
        hoy.unidadesEntrada += m.cantidad;
      } else {
        hoy.salidas++;
        hoy.unidadesSalida += m.cantidad;
      }
    }

    // le ponemos nombre a los mas vendidos
    const idsVendidos = masVendidos.map((v) => v.productoId);
    const productosVendidos = await prisma.producto.findMany({
      where: { usuarioId, id: { in: idsVendidos } },
      select: { id: true, nombre: true },
    });

    const topVendidos = masVendidos.map((v) => ({
      producto: productosVendidos.find((p) => p.id === v.productoId) ?? null,
      unidadesVendidas: v._sum.cantidad ?? 0,
    }));

    let valorCompra = 0;
    let valorVenta = 0;

    for (const p of productos) {
      valorCompra += p.stockActual * Number(p.precioCompra);
      valorVenta += p.stockActual * Number(p.precioVenta);
    }

    const mes = { ventas: 0, compras: 0, perdidas: 0 };

    for (const m of movimientosMes) {
      const total = m.cantidad * Number(m.precioUnitario ?? 0);

      if (m.motivo === "VENTA") mes.ventas += total;
      if (m.motivo === "COMPRA") mes.compras += total;
      if (m.motivo === "PERDIDA") mes.perdidas += total;
    }

    return res.status(200).json({
      resumen: {
        totalProductos: productos.length,
        totalCategorias,
        totalProveedores,
        stockBajo: listaStockBajo.length,
        agotados,
      },
      hoy,
      listaStockBajo,
      ultimosMovimientos,
      topVendidos,
      inventario: {
        valorCompra: redondear(valorCompra),
        valorVenta: redondear(valorVenta),
        gananciaPotencial: redondear(valorVenta - valorCompra),
      },
      mes: {
        ventas: redondear(mes.ventas),
        compras: redondear(mes.compras),
        perdidas: redondear(mes.perdidas),
      },
    });
  } catch (error) {
    console.error("Error en obtenerDashboard:", error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
}