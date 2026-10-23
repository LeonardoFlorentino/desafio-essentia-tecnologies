import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  TestRequest,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { today } from '../shared/dates';
import { Task } from './task.model';
import { TaskListPage } from './task-list-page';

const base: Task = {
  id: 1,
  title: 'Write the report',
  description: null,
  completed: false,
  dueDate: null,
  priority: 'medium',
  createdAt: '2026-10-22T12:00:00.000Z',
  updatedAt: '2026-10-22T12:00:00.000Z',
};

describe('TaskListPage — due date, priority, search and filters', () => {
  let fixture: ComponentFixture<TaskListPage>;
  let http: HttpTestingController;
  let router: Router;
  let page: HTMLElement;

  /** Opens the page at `url` and returns the first list request (not answered yet). */
  async function open(url: string): Promise<TestRequest> {
    TestBed.configureTestingModule({
      imports: [TaskListPage],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    await router.navigateByUrl(url);
    fixture = TestBed.createComponent(TaskListPage);
    page = fixture.nativeElement;
    fixture.detectChanges();
    return listRequest();
  }

  function listRequest() {
    return http.expectOne((req) => req.method === 'GET' && req.url === '/api/tasks');
  }

  async function answer(req: TestRequest, tasks: Task[]) {
    req.flush(tasks);
    await fixture.whenStable();
  }

  function field<T extends HTMLElement = HTMLInputElement>(selector: string) {
    return page.querySelector<T>(selector)!;
  }

  function choose(selector: string, value: string) {
    const select = field<HTMLSelectElement>(selector);
    select.value = value;
    select.dispatchEvent(new Event('change'));
  }

  function type(selector: string, value: string) {
    const input = field(selector);
    input.value = value;
    input.dispatchEvent(new Event('input'));
  }

  afterEach(() => http.verify());

  describe('filters', () => {
    it('restores the filters from the URL and sends them to the API', async () => {
      const req = await open('/?status=pending&priority=high&search=report&sort=due_date');

      expect(req.request.params.toString()).toBe(
        'search=report&status=pending&priority=high&sort=due_date',
      );
      await answer(req, [base]);
      expect(field('#filter-search').value).toBe('report');
      expect(field<HTMLSelectElement>('#filter-status').value).toBe('pending');
      expect(field<HTMLSelectElement>('#filter-priority').value).toBe('high');
      expect(field<HTMLSelectElement>('#filter-sort').value).toBe('due_date');
    });

    it('ignores unknown values typed into the URL (no failed request)', async () => {
      const req = await open('/?status=done&sort=title');
      expect(req.request.params.keys()).toEqual([]);
      await answer(req, []);
    });

    it('applies a select at once and keeps it in the URL', async () => {
      await answer(await open('/'), [base]);

      choose('#filter-status', 'completed');
      await fixture.whenStable();

      expect(router.url).toBe('/?status=completed');
      const req = listRequest();
      expect(req.request.params.get('status')).toBe('completed');
      await answer(req, []);
    });

    it('waits for a pause in typing before searching', async () => {
      await answer(await open('/'), [base]);

      type('#filter-search', 'rep');
      type('#filter-search', 'report');
      await fixture.whenStable();
      http.expectNone((req) => req.url === '/api/tasks');

      await new Promise((resolve) => setTimeout(resolve, 350));
      await fixture.whenStable();
      expect(router.url).toBe('/?search=report');
      expect(listRequest().request.params.get('search')).toBe('report');
    });

    it('says when nothing matches and clears the filters', async () => {
      await answer(await open('/?priority=low'), []);

      expect(page.textContent).toContain('Nenhuma tarefa encontrada com estes filtros.');
      expect(page.textContent).not.toContain('Nenhuma tarefa cadastrada');

      field<HTMLButtonElement>('.filters__clear').click();
      await fixture.whenStable();

      expect(router.url).toBe('/');
      expect(field<HTMLSelectElement>('#filter-priority').value).toBe('');
      await answer(listRequest(), [base]);
      expect(page.querySelector('.filters__clear')).toBeNull();
    });

    it('fetches the list again when a change may take the task out of the filter', async () => {
      await answer(await open('/?status=pending'), [base]);

      page.querySelector<HTMLInputElement>('li input[type=checkbox]')!.click();
      http.expectOne('/api/tasks/1').flush({ ...base, completed: true });
      await fixture.whenStable();

      await answer(listRequest(), []);
      expect(page.querySelectorAll('li')).toHaveLength(0);
    });

    it('tells the user when a new task is hidden by the filters', async () => {
      await answer(await open('/?status=completed'), []);

      type('#new-task-title', 'Hidden one');
      page.querySelector('form.task-form')!.dispatchEvent(new Event('submit'));
      http.expectOne((req) => req.method === 'POST').flush({ ...base, id: 9, title: 'Hidden one' });
      await fixture.whenStable();
      await answer(listRequest(), []);

      expect(page.querySelector('.notice[role=status]')?.textContent).toContain(
        'Tarefa “Hidden one” adicionada, mas ela não aparece com os filtros atuais.',
      );
    });
  });

  describe('due date and priority', () => {
    const day = (offset: number) => {
      const date = new Date();
      date.setDate(date.getDate() + offset);
      return today(date);
    };

    it('shows the priority and the due date of each task', async () => {
      await answer(await open('/'), [{ ...base, priority: 'high', dueDate: '2030-01-05' }]);

      const item = page.querySelector('li')!;
      expect(item.textContent).toContain('Prioridade alta');
      expect(item.textContent).toContain('Prazo: 05/01/2030');
    });

    it('highlights overdue and due-today tasks, but not completed ones', async () => {
      await answer(await open('/'), [
        { ...base, id: 1, dueDate: day(-1) },
        { ...base, id: 2, dueDate: day(0) },
        { ...base, id: 3, dueDate: day(-1), completed: true },
      ]);

      const [overdue, dueToday, done] = page.querySelectorAll('li');
      expect(overdue.textContent).toContain('Atrasada');
      expect(overdue.querySelector('.task--overdue')).not.toBeNull();
      expect(dueToday.textContent).toContain('Vence hoje');
      expect(done.textContent).not.toContain('Atrasada');
    });

    it('creates a task with a due date and a priority', async () => {
      await answer(await open('/'), []);

      type('#new-task-title', 'Pay the bill');
      type('#new-task-due', '05112026');
      choose('#new-task-priority', 'high');
      page.querySelector('form.task-form')!.dispatchEvent(new Event('submit'));

      const req = http.expectOne((r) => r.method === 'POST');
      expect(req.request.body).toEqual({
        title: 'Pay the bill',
        description: null,
        dueDate: '2026-11-05',
        priority: 'high',
      });
      req.flush({ ...base, title: 'Pay the bill', dueDate: '2026-11-05', priority: 'high' });
    });

    it('edits the due date (clearing it) and the priority', async () => {
      await answer(await open('/'), [{ ...base, dueDate: '2026-11-05', priority: 'high' }]);

      field<HTMLButtonElement>('#edit-button-1').click();
      await fixture.whenStable();
      expect(field('#edit-due-1').value).toBe('05/11/2026');
      expect(field<HTMLSelectElement>('#edit-priority-1').value).toBe('high');

      type('#edit-due-1', '');
      choose('#edit-priority-1', 'low');
      page.querySelector('li form')!.dispatchEvent(new Event('submit'));

      const req = http.expectOne('/api/tasks/1');
      expect(req.request.body).toMatchObject({ dueDate: null, priority: 'low' });
      req.flush({ ...base, dueDate: null, priority: 'low' });
    });
  });
});
