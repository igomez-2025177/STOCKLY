import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_URL } from '../config';
import {
  FiltrosMovimiento,
  ListaMovimientos,
  MovimientoPayload,
  RespuestaMovimiento,
} from '../models/movimiento.model';

@Injectable({ providedIn: 'root' })
export class MovimientoService {
  private http = inject(HttpClient);
  private url = `${API_URL}/movimientos`;

  listar(filtros: FiltrosMovimiento = {}): Observable<ListaMovimientos> {
    let params = new HttpParams();

    for (const [clave, valor] of Object.entries(filtros)) {
      if (valor !== undefined && valor !== null && valor !== '') {
        params = params.set(clave, String(valor));
      }
    }

    return this.http.get<ListaMovimientos>(this.url, { params });
  }

  registrar(datos: MovimientoPayload): Observable<RespuestaMovimiento> {
    return this.http.post<RespuestaMovimiento>(this.url, datos);
  }
}