import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { API_URL } from '../config';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.token();
  const esApi = req.url.startsWith(API_URL);

  const peticion =
    token && esApi ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(peticion).pipe(
    catchError((error: HttpErrorResponse) => {
      const esRutaAuth = req.url.includes('/auth/login') || req.url.includes('/auth/register');

      if (error.status === 401 && esApi && !esRutaAuth && auth.estaLogueado()) {
        auth.logout('Tu sesión terminó, vuelve a iniciar sesión');
      }

      return throwError(() => error);
    })
  );
};