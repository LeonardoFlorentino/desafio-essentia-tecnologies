import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Task } from './task.model';
import { TaskListPage } from './task-list-page';

const tasks: Task[] = [
  {
    id: 2,
    title: 'Call the client',
    description: null,
    completed: true,
    createdAt: '2026-10-22T13:00:00.000Z',
    updatedAt: '2026-10-22T13:00:00.000Z',
  },
  {
    id: 1,
    title: 'Write the report',
    description: 'Quarterly numbers',
    completed: false,
    createdAt: '2026-10-22T12:00:00.000Z',
    updatedAt: '2026-10-22T12:00:00.000Z',
  },
];

describe('TaskListPage', () => {
  let fixture: ComponentFixture<TaskListPage>;
  let http: HttpTestingController;
  let page: HTMLElement;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [TaskListPage],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    fixture = TestBed.createComponent(TaskListPage);
    http = TestBed.inject(HttpTestingController);
    page = fixture.nativeElement;
    fixture.detectChanges();
    http.expectOne('/api/tasks').flush(tasks);
    await fixture.whenStable();
  });

  afterEach(() => http.verify());

  function type(selector: string, value: string) {
    const field = page.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector)!;
    field.value = value;
    field.dispatchEvent(new Event('input'));
  }

  function submit() {
    page.querySelector('form')!.dispatchEvent(new Event('submit'));
  }

  it('loads the tasks from the API and shows every one of them', () => {
    const items = page.querySelectorAll('li');
    expect(items).toHaveLength(2);
    expect(items[0].textContent).toContain('Call the client');
    expect(items[0].textContent).toContain('Concluída');
    expect(items[1].textContent).toContain('Write the report');
    expect(items[1].textContent).toContain('Quarterly numbers');
    expect(items[1].textContent).toContain('Pendente');
  });

  it('creates a task, shows it first and clears the form', async () => {
    type('#new-task-title', '  Send the proposal  ');
    type('#new-task-description', 'By email');
    submit();

    const req = http.expectOne('/api/tasks');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ title: 'Send the proposal', description: 'By email' });
    req.flush({ ...tasks[1], id: 3, title: 'Send the proposal', description: 'By email' });
    await fixture.whenStable();

    const items = page.querySelectorAll('li');
    expect(items).toHaveLength(3);
    expect(items[0].textContent).toContain('Send the proposal');
    expect(page.querySelector<HTMLInputElement>('#new-task-title')!.value).toBe('');
    expect(page.querySelector<HTMLTextAreaElement>('#new-task-description')!.value).toBe('');
  });

  it('sends a blank description as null', () => {
    type('#new-task-title', 'Only a title');
    submit();

    const req = http.expectOne('/api/tasks');
    expect(req.request.body).toEqual({ title: 'Only a title', description: null });
    req.flush({ ...tasks[1], id: 3, title: 'Only a title', description: null });
  });

  it.each(['', '   '])(
    'does not send a task with the title "%s" and explains why',
    async (title) => {
      type('#new-task-title', title);
      submit();
      await fixture.whenStable();

      http.expectNone('/api/tasks');
      const input = page.querySelector('#new-task-title')!;
      expect(input.getAttribute('aria-invalid')).toBe('true');
      expect(page.querySelector('#new-task-title-error')?.textContent).toContain(
        'Informe o título da tarefa.',
      );
    },
  );
});
