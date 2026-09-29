export interface Proveedor {
  id: number;
  nombre: string;
  contacto: string | null;
  telefono: string | null;
  correo: string | null;
  nit: string | null;
  activo: boolean;
  creadoEn: string;
  actualizadoEn: string;
  _count?: { productos: number; movimientos?: number };
}

export interface ProveedorForm {
  nombre: string;
  contacto: string;
  telefono: string;
  correo: string;
  nit: string;
}