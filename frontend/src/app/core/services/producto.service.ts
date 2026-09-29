import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_URL } from '../config';
import { FiltrosProducto, Producto, ProductoPayload, RespuestaProducto } from '../models/producto.model';

@Injectable({ providedIn: 'root' })
export class ProductoService {
  private http = inject(HttpClient);
  private url = `${API_URL}/productos`;

  listar(filtros: FiltrosProducto = {}): Observable<{ productos: Producto[] }> {
    let params = new HttpParams();

    if (filtros.categoriaId) params = params.set('categoriaId', filtros.categoriaId);
    if (filtros.proveedorId) params = params.set('proveedorId', filtros.proveedorId);
    if (filtros.stockBajo) params = params.set('stockBajo', 'true');
    if (filtros.todos) params = params.set('todos', 'true');

    return this.http.get<{ productos: Producto[] }>(this.url, { params });
  }

  crear(datos: ProductoPayload): Observable<RespuestaProducto> {
    return this.http.post<RespuestaProducto>(this.url, datos);
  }

  actualizar(id: number, datos: ProductoPayload): Observable<RespuestaProducto> {
    return this.http.put<RespuestaProducto>(`${this.url}/${id}`, datos);
  }

  cambiarEstado(id: number, activo: boolean): Observable<RespuestaProducto> {
    return this.http.patch<RespuestaProducto>(`${this.url}/${id}/estado`, { activo });
  }

  eliminar(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.url}/${id}`);
  }
}