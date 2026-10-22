import { Routes } from '@angular/router';

const authPage = () => import('./auth/auth-page').then((m) => m.AuthPage);

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./tasks/task-list-page').then((m) => m.TaskListPage),
  },
  { path: 'login', loadComponent: authPage, data: { mode: 'login' } },
  { path: 'register', loadComponent: authPage, data: { mode: 'register' } },
  { path: '**', redirectTo: '' },
];
