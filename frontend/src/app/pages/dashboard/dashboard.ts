import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe, DecimalPipe, LowerCasePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { DashboardService } from '../../core/services/dashboard.service';
import { Dashboard as DatosDashboard } from '../../core/models/dashboard.model';
import { MOTIVO_TEXTO } from '../../core/models/movimiento.model';

@Component({
  selector: 'app-dashboard',
  imports: [CurrencyPipe, DatePipe, DecimalPipe, LowerCasePipe, RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit {
  readonly auth = inject(AuthService);
  private dashboardService = inject(DashboardService);

  readonly datos = signal<DatosDashboard | null>(null);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly hoy = new Date();
  readonly motivoTexto = MOTIVO_TEXTO;

  readonly saludo = computed(() => {
    const hora = this.hoy.getHours();
    const nombre = this.auth.usuario()?.nombre.split(' ')[0] ?? '';

    if (hora < 12) return `Buenos días, ${nombre}`;
    if (hora < 19) return `Buenas tardes, ${nombre}`;
    return `Buenas noches, ${nombre}`;
  });

  // pa las barritas del top vendidos
  readonly maxVendido = computed(() => {
    const top = this.datos()?.topVendidos ?? [];
    return Math.max(1, ...top.map((t) => t.unidadesVendidas));
  });

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set(null);

    this.dashboardService.obtener().subscribe({
      next: (datos) => {
        this.datos.set(datos);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar el dashboard. Revisa que el backend esté corriendo');
        this.cargando.set(false);
      },
    });
  }
}