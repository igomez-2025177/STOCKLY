export type TipoMovimiento = 'ENTRADA' | 'SALIDA';
export type MotivoMovimiento = 'COMPRA' | 'VENTA' | 'PERDIDA' | 'DEVOLUCION' | 'AJUSTE';

export interface Movimiento {
  id: number;
  tipo: TipoMovimiento;
  motivo: MotivoMovimiento;
  cantidad: number;
  stockResultante: number;
  precioUnitario: string | null;
  referencia: string | null;
  nota: string | null;
  fecha: string;
  producto: { id: number; sku: string; nombre: string; unidad: string };
  usuario: { id: number; nombre: string };
  proveedor: { id: number; nombre: string } | null;
}

export const MOTIVO_TEXTO: Record<MotivoMovimiento, string> = {
  COMPRA: 'Compra',
  VENTA: 'Venta',
  PERDIDA: 'Pérdida',
  DEVOLUCION: 'Devolución',
  AJUSTE: 'Ajuste',
};