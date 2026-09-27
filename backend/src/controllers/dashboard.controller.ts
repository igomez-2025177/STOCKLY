import { Response } from "express";
import { prisma } from "../config/prisma";
import { AuthRequest } from "../middlewares/auth.middleware";

const INCLUDE_MOVIMIENTO = {
  producto: { select: { id: true, sku: true, nombre: true, unidad: true } },
  usuario: { select: { id: true, nombre: true } },
  proveedor: { select: { id: true, nombre: true } },
};

function redondear(valor: number): number {
  return Math.round(valor * 100) / 100;
}

export async function obtenerDashboard(req: AuthRequest, res: Response) {
  try {
    const esAdmin = req.user?.role === "ADMIN";

    const ahora = new Date();
    const inicioHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
    const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);

    const [productos, totalCategorias, totalProveedores, movimientosHoy, ultimosMovimientos, masVendidos] =
      await Promise.all([

        prisma.producto.findMany({
          where: { activo: true },
          select: {
            id: true,
            sku: true,
            nombre: true,
            unidad: true,
            stockActual: true,
            stockMinimo: true,
            precioCompra: true,
            precioVenta: true,
            categoria: { select: { id: true, nombre: true } },
          },
        }),
        prisma.categoria.count({ where: { activo: true } }),
        prisma.proveedor.count({ where: { activo: true } }),
        prisma.movimiento.findMany({
          where: { fecha: { gte: inicioHoy } },
          select: { tipo: true, cantidad: true },
        }),
        prisma.movimiento.findMany({
          include: INCLUDE_MOVIMIENTO,
          orderBy: [{ fecha: "desc" }, { id: "desc" }],
          take: 10,
        }),
        prisma.movimiento.groupBy({
          by: ["productoId"],
          where: { motivo: "VENTA", fecha: { gte: inicioMes } },
          _sum: { cantidad: true },
          orderBy: { _sum: { cantidad: "desc" } },
          take: 5,
        }),
      ]);

    const listaStockBajo = productos
      .filter((p) => p.stockActual <= p.stockMinimo)
      .sort((a, b) => a.stockActual - b.stockActual)
      .map((p) => ({
        id: p.id,
        sku: p.sku,
        nombre: p.nombre,
        unidad: p.unidad,
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

    const idsVendidos = masVendidos.map((v) => v.productoId);
    const productosVendidos = await prisma.producto.findMany({
      where: { id: { in: idsVendidos } },
      select: { id: true, sku: true, nombre: true, unidad: true },
    });

    const topVendidos = masVendidos.map((v) => ({
      producto: productosVendidos.find((p) => p.id === v.productoId) ?? null,
      unidadesVendidas: v._sum.cantidad ?? 0,
    }));

    const respuesta: Record<string, unknown> = {
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
    };

    if (esAdmin) {
      let valorCompra = 0;
      let valorVenta = 0;

      for (const p of productos) {
        valorCompra += p.stockActual * Number(p.precioCompra);
        valorVenta += p.stockActual * Number(p.precioVenta);
      }

      const movimientosMes = await prisma.movimiento.findMany({
        where: {
          fecha: { gte: inicioMes },
          motivo: { in: ["VENTA", "COMPRA", "PERDIDA"] },
        },
        select: { motivo: true, cantidad: true, precioUnitario: true },
      });

      const mes = { ventas: 0, compras: 0, perdidas: 0 };

      for (const m of movimientosMes) {
        const total = m.cantidad * Number(m.precioUnitario ?? 0);

        if (m.motivo === "VENTA") mes.ventas += total;
        if (m.motivo === "COMPRA") mes.compras += total;
        if (m.motivo === "PERDIDA") mes.perdidas += total;
      }

      respuesta.inventario = {
        valorCompra: redondear(valorCompra),
        valorVenta: redondear(valorVenta),
        gananciaPotencial: redondear(valorVenta - valorCompra),
      };

      respuesta.mes = {
        ventas: redondear(mes.ventas),
        compras: redondear(mes.compras),
        perdidas: redondear(mes.perdidas),
      };
    }

    return res.status(200).json(respuesta);
  } catch (error) {
    console.error("Error en obtenerDashboard:", error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
}