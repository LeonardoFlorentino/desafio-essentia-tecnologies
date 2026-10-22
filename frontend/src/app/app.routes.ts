import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './auth/auth.guards';

const authPage = () => import('./auth/auth-page').then((m) => m.AuthPage);

export const routes: Routes = [
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./tasks/task-list-page').then((m) => m.TaskListPage),
  },
  { path: 'login', canActivate: [guestGuard], loadComponent: authPage, data: { mode: 'login' } },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: authPage,
    data: { mode: 'register' },
  },
  { path: '**', redirectTo: '' },
];
