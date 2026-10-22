import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./tasks/task-list-page').then((m) => m.TaskListPage),
  },
  { path: '**', redirectTo: '' },
];
