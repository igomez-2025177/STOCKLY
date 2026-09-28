export interface Usuario {
  id: number;
  nombre: string;
  correo: string;
}

export interface AuthResponse {
  message: string;
  token: string;
  user: Usuario;
}