import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_URL } from '../config';
import { Proveedor, ProveedorForm } from '../models/proveedor.model';

@Injectable({ providedIn: 'root' })
export class ProveedorService {
  private http = inject(HttpClient);
  private url = `${API_URL}/proveedores`;

  listar(todos = false): Observable<{ proveedores: Proveedor[] }> {
    const params = todos ? new HttpParams().set('todos', 'true') : undefined;
    return this.http.get<{ proveedores: Proveedor[] }>(this.url, { params });
  }

  crear(datos: ProveedorForm): Observable<{ message: string; proveedor: Proveedor }> {
    return this.http.post<{ message: string; proveedor: Proveedor }>(this.url, datos);
  }

  actualizar(id: number, datos: ProveedorForm): Observable<{ message: string; proveedor: Proveedor }> {
    return this.http.put<{ message: string; proveedor: Proveedor }>(`${this.url}/${id}`, datos);
  }

  cambiarEstado(id: number, activo: boolean): Observable<{ message: string; proveedor: Proveedor }> {
    return this.http.patch<{ message: string; proveedor: Proveedor }>(`${this.url}/${id}/estado`, { activo });
  }

  eliminar(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.url}/${id}`);
  }
}