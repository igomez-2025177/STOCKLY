export interface Usuario {
  id: number;
  nombre: string;
  correo: string;
}

export interface PerfilUsuario extends Usuario {
  tienePassword: boolean;
  conGoogle: boolean;
}

export interface AuthResponse {
  message: string;
  token: string;
  user: Usuario;
}