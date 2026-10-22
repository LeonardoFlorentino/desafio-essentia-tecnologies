import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { NewTask, Task, TaskChanges } from './task.model';

// Relative URL: the dev server proxies /api to the backend (proxy.conf.json), so the
// app and the API share one origin.
const TASKS_URL = '/api/tasks';

@Injectable({ providedIn: 'root' })
export class TaskService {
  private readonly http = inject(HttpClient);

  list() {
    return this.http.get<Task[]>(TASKS_URL);
  }

  create(task: NewTask) {
    return this.http.post<Task>(TASKS_URL, task);
  }

  update(id: number, changes: TaskChanges) {
    return this.http.patch<Task>(`${TASKS_URL}/${id}`, changes);
  }

  remove(id: number) {
    return this.http.delete<void>(`${TASKS_URL}/${id}`);
  }
}
