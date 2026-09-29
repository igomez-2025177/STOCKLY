import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { InactividadService } from '../../core/services/inactividad.service';

interface SeccionMenu {
  titulo: string;
  links: { texto: string; ruta: string }[];
}

const MENU: SeccionMenu[] = [
  {
    titulo: 'Inventario',
    links: [
      { texto: 'Dashboard', ruta: '/dashboard' },
      { texto: 'Productos', ruta: '/productos' },
      { texto: 'Movimientos', ruta: '/movimientos' },
    ],
  },
  {
    titulo: 'Catálogos',
    links: [
      { texto: 'Categorías', ruta: '/categorias' },
      { texto: 'Proveedores', ruta: '/proveedores' },
    ],
  },
  {
    titulo: 'Cuenta',
    links: [{ texto: 'Mi cuenta', ruta: '/cuenta' }],
  },
];

@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './layout.html',
  styleUrl: './layout.css',
})
export class Layout implements OnInit, OnDestroy {
  readonly auth = inject(AuthService);
  readonly inactividad = inject(InactividadService);
  readonly menuAbierto = signal(false);
  readonly menu = MENU;

  readonly iniciales = computed(() => {
    const nombre = this.auth.usuario()?.nombre ?? '';
    return nombre
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((parte) => parte[0].toUpperCase())
      .join('');
  });

  ngOnInit(): void {
    this.auth.refrescarUsuario().subscribe({ error: () => {} });

    this.inactividad.iniciar();
  }

  ngOnDestroy(): void {
    this.inactividad.detener();
  }

  cerrarMenu(): void {
    this.menuAbierto.set(false);
  }

  cerrarSesion(): void {
    this.inactividad.detener();
    this.auth.logout();
  }
}