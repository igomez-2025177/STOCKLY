import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_URL } from '../config';
import { Categoria, CategoriaForm } from '../models/categoria.model';

@Injectable({ providedIn: 'root' })
export class CategoriaService {
  private http = inject(HttpClient);
  private url = `${API_URL}/categorias`;

  listar(todas = false): Observable<{ categorias: Categoria[] }> {
    const params = todas ? new HttpParams().set('todas', 'true') : undefined;
    return this.http.get<{ categorias: Categoria[] }>(this.url, { params });
  }

  crear(datos: CategoriaForm): Observable<{ message: string; categoria: Categoria }> {
    return this.http.post<{ message: string; categoria: Categoria }>(this.url, datos);
  }

  actualizar(id: number, datos: CategoriaForm): Observable<{ message: string; categoria: Categoria }> {
    return this.http.put<{ message: string; categoria: Categoria }>(`${this.url}/${id}`, datos);
  }

  cambiarEstado(id: number, activo: boolean): Observable<{ message: string; categoria: Categoria }> {
    return this.http.patch<{ message: string; categoria: Categoria }>(`${this.url}/${id}/estado`, { activo });
  }

  eliminar(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.url}/${id}`);
  }
}