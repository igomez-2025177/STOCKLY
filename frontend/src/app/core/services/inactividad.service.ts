import { Injectable, computed, inject, signal } from '@angular/core';
import { AuthService } from './auth.service';


const TIEMPO_INACTIVIDAD_MS = 9 * 60 * 1000;
const TIEMPO_CIERRE_MS = 60 * 1000; 

const EVENTOS_ACTIVIDAD = ['mousemove', 'mousedown', 'keydown', 'scroll', 'wheel', 'touchstart'];

@Injectable({ providedIn: 'root' })
export class InactividadService {
  private auth = inject(AuthService);

  readonly avisoVisible = signal(false);
  readonly segundosRestantes = signal(0);

  readonly porcentajeRestante = computed(
    () => ((this.segundosRestantes() * 1000) / TIEMPO_CIERRE_MS) * 100
  );

  private activo = false;
  private ultimaActividad = 0;
  private timerFase1?: ReturnType<typeof setTimeout>;
  private intervaloFase2?: ReturnType<typeof setInterval>;

  private readonly alHaberActividad = () => {
    const ahora = Date.now();
    if (ahora - this.ultimaActividad < 300) return;
    this.ultimaActividad = ahora;
    this.reiniciar();
  };

  iniciar(): void {
    if (this.activo) return;
    this.activo = true;

    for (const evento of EVENTOS_ACTIVIDAD) {
      document.addEventListener(evento, this.alHaberActividad, { passive: true, capture: true });
    }

    this.reiniciar();
  }

  detener(): void {
    this.activo = false;

    for (const evento of EVENTOS_ACTIVIDAD) {
      document.removeEventListener(evento, this.alHaberActividad, { capture: true });
    }

    this.limpiarTimers();
    this.avisoVisible.set(false);
  }

  private reiniciar(): void {
    if (!this.activo) return;

    this.limpiarTimers();
    this.avisoVisible.set(false);
    this.timerFase1 = setTimeout(() => this.empezarCuentaRegresiva(), TIEMPO_INACTIVIDAD_MS);
  }

  private empezarCuentaRegresiva(): void {
    let restantes = Math.round(TIEMPO_CIERRE_MS / 1000);

    this.segundosRestantes.set(restantes);
    this.avisoVisible.set(true);

    this.intervaloFase2 = setInterval(() => {
      restantes--;
      this.segundosRestantes.set(restantes);

      if (restantes <= 0) {
        this.cerrarPorInactividad();
      }
    }, 1000);
  }

  private cerrarPorInactividad(): void {
    this.detener();
    this.auth.logout('Tu sesión se cerró por inactividad');
  }

  private limpiarTimers(): void {
    clearTimeout(this.timerFase1);
    clearInterval(this.intervaloFase2);
  }
}