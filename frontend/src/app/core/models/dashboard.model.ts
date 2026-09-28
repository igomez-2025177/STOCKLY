import { Movimiento } from './movimiento.model';

export interface ProductoStockBajo {
  id: number;
  sku: string;
  nombre: string;
  unidad: string;
  stockActual: number;
  stockMinimo: number;
  faltan: number;
  categoria: { id: number; nombre: string };
}

export interface TopVendido {
  producto: { id: number; sku: string; nombre: string; unidad: string } | null;
  unidadesVendidas: number;
}

export interface Dashboard {
  resumen: {
    totalProductos: number;
    totalCategorias: number;
    totalProveedores: number;
    stockBajo: number;
    agotados: number;
  };
  hoy: {
    entradas: number;
    unidadesEntrada: number;
    salidas: number;
    unidadesSalida: number;
  };
  listaStockBajo: ProductoStockBajo[];
  ultimosMovimientos: Movimiento[];
  topVendidos: TopVendido[];
  inventario: {
    valorCompra: number;
    valorVenta: number;
    gananciaPotencial: number;
  };
  mes: {
    ventas: number;
    compras: number;
    perdidas: number;
  };
}