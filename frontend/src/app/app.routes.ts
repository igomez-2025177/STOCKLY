import { Routes } from '@angular/router';
import { authGuard, invitadoGuard } from './core/guards/auth.guards';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [invitadoGuard],
    loadComponent: () => import('./pages/login/login').then((m) => m.Login),
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/dashboard/dashboard').then((m) => m.Dashboard),
  },
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: '**', redirectTo: 'dashboard' },
];