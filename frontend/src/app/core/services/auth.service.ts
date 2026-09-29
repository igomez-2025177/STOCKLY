import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { API_URL } from '../config';
import { AuthResponse, PerfilUsuario, Usuario } from '../models/usuario.model';

const TOKEN_KEY = 'stockly_token';
const USUARIO_KEY = 'stockly_usuario';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private _token = signal<string | null>(null);
  private _usuario = signal<Usuario | null>(null);

  readonly token = this._token.asReadonly();
  readonly usuario = this._usuario.asReadonly();
  readonly estaLogueado = computed(() => !!this._token() && !!this._usuario());

  readonly mensajeLogin = signal<string | null>(null);

  constructor() {
    this.cargarSesion();
  }

  login(correo: string, password: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${API_URL}/auth/login`, { correo, password })
      .pipe(tap((res) => this.guardarSesion(res)));
  }

  register(nombre: string, correo: string, password: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${API_URL}/auth/register`, { nombre, correo, password })
      .pipe(tap((res) => this.guardarSesion(res)));
  }

  loginGoogle(credential: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${API_URL}/auth/google`, { credential })
      .pipe(tap((res) => this.guardarSesion(res)));
  }

  refrescarUsuario(): Observable<{ user: PerfilUsuario }> {
    return this.obtenerPerfil();
  }

  obtenerPerfil(): Observable<{ user: PerfilUsuario }> {
    return this.http.get<{ user: PerfilUsuario }>(`${API_URL}/auth/me`).pipe(
      tap(({ user }) => this.actualizarUsuarioLocal(user))
    );
  }

  actualizarNombre(nombre: string): Observable<{ message: string; user: Usuario }> {
    return this.http
      .patch<{ message: string; user: Usuario }>(`${API_URL}/auth/perfil`, { nombre })
      .pipe(tap(({ user }) => this.actualizarUsuarioLocal(user)));
  }

  cambiarPassword(passwordActual: string | null, passwordNuevo: string): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(`${API_URL}/auth/password`, {
      ...(passwordActual ? { passwordActual } : {}),
      passwordNuevo,
    });
  }

  logout(mensaje?: string): void {
    this.limpiarSesion();
    this.mensajeLogin.set(mensaje ?? null);

    try {
      (window as any).google?.accounts?.id?.disableAutoSelect();
    } catch {
    }

    this.router.navigate(['/login']);
  }

  private actualizarUsuarioLocal(user: Usuario): void {
    const basico: Usuario = { id: user.id, nombre: user.nombre, correo: user.correo };
    this._usuario.set(basico);
    this.guardarEnStorage(USUARIO_KEY, JSON.stringify(basico));
  }

  private guardarSesion(res: AuthResponse): void {
    this._token.set(res.token);
    this._usuario.set(res.user);
    this.guardarEnStorage(TOKEN_KEY, res.token);
    this.guardarEnStorage(USUARIO_KEY, JSON.stringify(res.user));
  }

  private cargarSesion(): void {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      const usuarioTexto = localStorage.getItem(USUARIO_KEY);

      if (!token || !usuarioTexto) return;

      if (this.tokenVencido(token)) {
        this.limpiarSesion();
        return;
      }

      this._token.set(token);
      this._usuario.set(JSON.parse(usuarioTexto) as Usuario);
    } catch {
      this.limpiarSesion();
    }
  }

  private tokenVencido(token: string): boolean {
    try {
      const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(atob(base64));
      return typeof payload.exp !== 'number' || payload.exp * 1000 < Date.now();
    } catch {
      return true;
    }
  }

  private limpiarSesion(): void {
    this._token.set(null);
    this._usuario.set(null);

    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USUARIO_KEY);
    } catch {
    }
  }

  private guardarEnStorage(clave: string, valor: string): void {
    try {
      localStorage.setItem(clave, valor);
    } catch {
    }
  }
}