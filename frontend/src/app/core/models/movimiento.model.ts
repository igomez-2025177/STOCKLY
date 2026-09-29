export type TipoMovimiento = 'ENTRADA' | 'SALIDA';
export type MotivoMovimiento = 'COMPRA' | 'VENTA' | 'PERDIDA' | 'DEVOLUCION' | 'AJUSTE';

export interface Movimiento {
  id: number;
  tipo: TipoMovimiento;
  motivo: MotivoMovimiento;
  cantidad: number;
  stockResultante: number;
  precioUnitario: string | null;
  nota: string | null;
  fecha: string;
  producto: { id: number; nombre: string };
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

export const MOTIVOS_POR_TIPO: Record<TipoMovimiento, MotivoMovimiento[]> = {
  ENTRADA: ['COMPRA', 'DEVOLUCION', 'AJUSTE'],
  SALIDA: ['VENTA', 'PERDIDA', 'DEVOLUCION', 'AJUSTE'],
};

export const MOTIVOS_CON_NOTA: MotivoMovimiento[] = ['PERDIDA', 'AJUSTE'];

export function ayudaMotivo(tipo: TipoMovimiento, motivo: MotivoMovimiento): string {
  switch (motivo) {
    case 'COMPRA':
      return 'Llegó mercadería de un proveedor';
    case 'VENTA':
      return 'Le vendiste producto a un cliente';
    case 'PERDIDA':
      return 'Se dañó, se venció o se perdió. Explica qué pasó en la nota';
    case 'DEVOLUCION':
      return tipo === 'ENTRADA' ? 'Un cliente te regresó producto' : 'Le regresas producto al proveedor';
    case 'AJUSTE':
      return tipo === 'ENTRADA'
        ? 'Contaste y hay MÁS de lo que dice el sistema. Explica en la nota'
        : 'Contaste y hay MENOS de lo que dice el sistema. Explica en la nota';
  }
}

export function textoUnidades(cantidad: number): string {
  return Math.abs(cantidad) === 1 ? 'unidad' : 'unidades';
}

export interface MovimientoPayload {
  tipo: TipoMovimiento;
  motivo: MotivoMovimiento;
  cantidad: number;
  productoId: number;
  proveedorId: number | null;
  precioUnitario: number | null;
  nota: string;
}

export interface FiltrosMovimiento {
  productoId?: number | null;
  tipo?: TipoMovimiento | '';
  motivo?: MotivoMovimiento | '';
  desde?: string;
  hasta?: string;
  pagina?: number;
  limite?: number;
}

export interface ListaMovimientos {
  movimientos: Movimiento[];
  total: number;
  pagina: number;
  totalPaginas: number;
}

export interface RespuestaMovimiento {
  message: string;
  movimiento: Movimiento;
  alerta?: string;
}