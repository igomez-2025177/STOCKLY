export type Rol = 'ADMIN' | 'EMPLEADO';

export interface Usuario {
  id: number;
  nombre: string;
  correo: string;
  rol: Rol;
  activo?: boolean;
}

export interface AuthResponse {
  message: string;
  token: string;
  user: Usuario;
}