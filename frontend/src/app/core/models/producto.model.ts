export type Unidad = 'UNIDAD' | 'CAJA' | 'PAQUETE' | 'BOLSA' | 'DOCENA' | 'LIBRA' | 'LITRO' | 'METRO';
export const UNIDADES: { valor: Unidad; texto: string }[] = [
  { valor: 'UNIDAD', texto: 'Unidad' },
  { valor: 'CAJA', texto: 'Caja' },
  { valor: 'PAQUETE', texto: 'Paquete' },
  { valor: 'BOLSA', texto: 'Bolsa' },
  { valor: 'DOCENA', texto: 'Docena' },
  { valor: 'LIBRA', texto: 'Libra' },
  { valor: 'LITRO', texto: 'Litro' },
  { valor: 'METRO', texto: 'Metro' },
];

export interface Producto {
  id: number;
  sku: string;
  nombre: string;
  descripcion: string | null;
  unidad: Unidad;
  ubicacion: string | null;
  precioCompra: string;
  precioVenta: string;
  stockActual: number;
  stockMinimo: number;
  activo: boolean;
  categoriaId: number;
  proveedorId: number | null;
  creadoEn: string;
  actualizadoEn: string;
  categoria: { id: number; nombre: string; activo: boolean };
  proveedor: { id: number; nombre: string; activo: boolean } | null;
  stockBajo: boolean;
}

export interface ProductoPayload {
  sku: string;
  nombre: string;
  descripcion: string;
  unidad: Unidad;
  ubicacion: string;
  precioCompra: number;
  precioVenta: number;
  stockMinimo: number;
  categoriaId: number;
  proveedorId: number | null;
  stockInicial?: number;
}

export interface FiltrosProducto {
  categoriaId?: number | null;
  proveedorId?: number | null;
  stockBajo?: boolean;
  todos?: boolean;
}

export interface RespuestaProducto {
  message: string;
  producto: Producto;
  advertencia?: string;
}