import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Task } from './task.model';
import { TaskService } from './task.service';

const task: Task = {
  id: 1,
  title: 'Write the report',
  description: null,
  completed: false,
  dueDate: null,
  priority: 'medium',
  createdAt: '2026-10-22T13:00:00.000Z',
  updatedAt: '2026-10-22T13:00:00.000Z',
};

describe('TaskService', () => {
  let service: TaskService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(TaskService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lists the tasks with GET /api/tasks', () => {
    let result: Task[] | undefined;
    service.list().subscribe((tasks) => (result = tasks));

    const req = http.expectOne('/api/tasks');
    expect(req.request.method).toBe('GET');
    req.flush([task]);

    expect(result).toEqual([task]);
  });

  it('creates a task with POST /api/tasks', () => {
    let result: Task | undefined;
    service.create({ title: 'Write the report' }).subscribe((created) => (result = created));

    const req = http.expectOne('/api/tasks');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ title: 'Write the report' });
    req.flush(task);

    expect(result).toEqual(task);
  });

  it('sends only the changed fields with PATCH /api/tasks/:id', () => {
    service.update(1, { completed: true }).subscribe();

    const req = http.expectOne('/api/tasks/1');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ completed: true });
    req.flush({ ...task, completed: true });
  });

  it('deletes a task with DELETE /api/tasks/:id', () => {
    let done = false;
    service.remove(1).subscribe({ complete: () => (done = true) });

    const req = http.expectOne('/api/tasks/1');
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });

    expect(done).toBe(true);
  });
});
