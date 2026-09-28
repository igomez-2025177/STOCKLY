import { HttpErrorResponse } from '@angular/common/http';

export function mensajeError(err: unknown, porDefecto = 'Ocurrió un error, intenta de nuevo'): string {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 0) {
      return 'No se pudo conectar con el servidor. Revisa que el backend esté corriendo';
    }

    return err.error?.error ?? porDefecto;
  }

  return porDefecto;
}