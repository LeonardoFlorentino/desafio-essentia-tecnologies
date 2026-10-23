import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Task } from './task.model';
import { TaskListPage } from './task-list-page';

const task: Task = {
  id: 1,
  title: 'Write the report',
  description: null,
  completed: false,
  dueDate: null,
  priority: 'medium',
  createdAt: '2026-10-22T12:00:00.000Z',
  updatedAt: '2026-10-22T12:00:00.000Z',
};

/** Loading, empty and error states of the list (the first API response is controlled per test). */
describe('TaskListPage list states', () => {
  let fixture: ComponentFixture<TaskListPage>;
  let http: HttpTestingController;
  let page: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TaskListPage],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    fixture = TestBed.createComponent(TaskListPage);
    http = TestBed.inject(HttpTestingController);
    page = fixture.nativeElement;
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  const tasksSection = () => page.querySelector('section[aria-labelledby="list-heading"]')!;

  it('shows a loading message while the tasks are on their way', async () => {
    await fixture.whenStable();
    expect(tasksSection().textContent).toContain('Carregando tarefas…');
    expect(tasksSection().getAttribute('aria-busy')).toBe('true');

    http.expectOne('/api/tasks').flush([task]);
    await fixture.whenStable();

    expect(tasksSection().textContent).not.toContain('Carregando');
    expect(tasksSection().getAttribute('aria-busy')).toBe('false');
    expect(page.querySelectorAll('li')).toHaveLength(1);
  });

  it('says so when there are no tasks yet', async () => {
    http.expectOne('/api/tasks').flush([]);
    await fixture.whenStable();

    expect(tasksSection().textContent).toContain('Nenhuma tarefa cadastrada.');
    // The strip still answers: nothing is late or due, shown as zeros rather than hidden.
    const values = [...page.querySelectorAll('.strip__value')].map((v) => v.textContent!.trim());
    expect(values).toEqual(['0', '0', '0', '0']);
  });

  it('explains a failed load and retries on request', async () => {
    http.expectOne('/api/tasks').flush(null, { status: 500, statusText: 'Server Error' });
    await fixture.whenStable();

    const alert = page.querySelector('[role=alert]')!;
    expect(alert.textContent).toContain('Não foi possível carregar as tarefas.');
    expect(tasksSection().textContent).not.toContain('Nenhuma tarefa cadastrada');

    alert.querySelector('button')!.click();
    await fixture.whenStable();
    http.expectOne('/api/tasks').flush([task]);
    await fixture.whenStable();

    expect(page.querySelector('[role=alert]')).toBeNull();
    expect(page.querySelectorAll('li')).toHaveLength(1);
  });
});
