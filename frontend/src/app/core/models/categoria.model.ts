export interface Categoria {
  id: number;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  creadoEn: string;
  actualizadoEn: string;
  _count?: { productos: number };
}

export interface CategoriaForm {
  nombre: string;
  descripcion: string;
}