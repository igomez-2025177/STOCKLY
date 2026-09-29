export interface Producto {
  id: number;
  nombre: string;
  descripcion: string | null;
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
  nombre: string;
  descripcion: string;
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