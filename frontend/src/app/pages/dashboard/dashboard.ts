import { Component, inject } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-dashboard',
  template: `
    <main style="padding: 2rem">
      <div class="tarjeta" style="max-width: 480px">
        <span class="badge badge-lima">{{ auth.usuario()?.rol }}</span>
        <h2 style="margin-top: 0.75rem">Hola, {{ auth.usuario()?.nombre }}</h2>
        <p class="texto-suave">El login ya funciona. Aquí va a ir el dashboard.</p>
        <button class="btn btn-secundario" (click)="auth.logout()">Cerrar sesión</button>
      </div>
    </main>
  `,
})
export class Dashboard {
  readonly auth = inject(AuthService);
}