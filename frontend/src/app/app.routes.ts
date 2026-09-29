import { Routes } from '@angular/router';
import { authGuard, invitadoGuard } from './core/guards/auth.guards';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [invitadoGuard],
    loadComponent: () => import('./pages/login/login').then((m) => m.Login),
  },
  {
    // todo lo que va con el menu lateral
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./shared/layout/layout').then((m) => m.Layout),
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./pages/dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'productos',
        loadComponent: () => import('./pages/productos/productos').then((m) => m.Productos),
      },
      {
        path: 'movimientos',
        loadComponent: () => import('./pages/movimientos/movimientos').then((m) => m.Movimientos),
      },
      {
        path: 'categorias',
        loadComponent: () => import('./pages/categorias/categorias').then((m) => m.Categorias),
      },
      {
        path: 'proveedores',
        loadComponent: () => import('./pages/proveedores/proveedores').then((m) => m.Proveedores),
      },
      {
        path: 'cuenta',
        loadComponent: () => import('./pages/cuenta/cuenta').then((m) => m.Cuenta),
      },
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
    ],
  },
  { path: '**', redirectTo: '' },
];