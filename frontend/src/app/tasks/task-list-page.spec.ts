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

  function checkboxOf(item: number) {
    return page
      .querySelectorAll('li')
      [item].querySelector<HTMLInputElement>('input[type=checkbox]')!;
  }

  it('reflects each task status in its checkbox', () => {
    expect(checkboxOf(0).checked).toBe(true);
    expect(checkboxOf(1).checked).toBe(false);
    expect(checkboxOf(1).getAttribute('aria-label')).toBe('Concluída: Write the report');
  });

  it('marks a pending task as completed', async () => {
    checkboxOf(1).click();
    await fixture.whenStable();
    expect(checkboxOf(1).disabled).toBe(true);

    const req = http.expectOne('/api/tasks/1');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ completed: true });
    req.flush({ ...tasks[1], completed: true });
    await fixture.whenStable();

    const item = page.querySelectorAll('li')[1];
    expect(item.classList).toContain('task--completed');
    expect(item.textContent).toContain('Concluída');
    expect(checkboxOf(1).disabled).toBe(false);
  });

  it('marks a completed task as pending again', async () => {
    checkboxOf(0).click();

    const req = http.expectOne('/api/tasks/2');
    expect(req.request.body).toEqual({ completed: false });
    req.flush({ ...tasks[0], completed: false });
    await fixture.whenStable();

    const item = page.querySelectorAll('li')[0];
    expect(item.classList).not.toContain('task--completed');
    expect(item.textContent).toContain('Pendente');
  });

  it('puts the checkbox back when the API refuses the change', async () => {
    checkboxOf(1).click();
    http.expectOne('/api/tasks/1').flush(null, { status: 500, statusText: 'Server Error' });
    await fixture.whenStable();

    expect(checkboxOf(1).checked).toBe(false);
    expect(page.querySelectorAll('li')[1].textContent).toContain('Pendente');
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

  describe('inline editing', () => {
    async function openEditor(id: number) {
      page.querySelector<HTMLButtonElement>(`#edit-button-${id}`)!.click();
      await fixture.whenStable();
    }

    function field(id: string) {
      return page.querySelector<HTMLInputElement | HTMLTextAreaElement>(`#${id}`)!;
    }

    it('opens a form filled with the task data and focuses the title', async () => {
      await openEditor(1);

      expect(field('edit-title-1').value).toBe('Write the report');
      expect(field('edit-description-1').value).toBe('Quarterly numbers');
      expect(document.activeElement).toBe(field('edit-title-1'));
    });

    it('saves the changes with PATCH and shows the updated task', async () => {
      await openEditor(1);
      type('#edit-title-1', '  Write the final report  ');
      type('#edit-description-1', '');
      page.querySelector('li form')!.dispatchEvent(new Event('submit'));

      const req = http.expectOne('/api/tasks/1');
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ title: 'Write the final report', description: null });
      req.flush({ ...tasks[1], title: 'Write the final report', description: null });
      await fixture.whenStable();

      const item = page.querySelectorAll('li')[1];
      expect(item.querySelector('form')).toBeNull();
      expect(item.querySelector('h3')?.textContent).toBe('Write the final report');
      expect(item.textContent).not.toContain('Quarterly numbers');
      expect(document.activeElement?.id).toBe('edit-button-1');
    });

    it('cancels without sending anything and keeps the original data', async () => {
      await openEditor(1);
      type('#edit-title-1', 'Something else');
      page.querySelector<HTMLButtonElement>('li form button[type=button]')!.click();
      await fixture.whenStable();

      http.expectNone('/api/tasks/1');
      const item = page.querySelectorAll('li')[1];
      expect(item.querySelector('form')).toBeNull();
      expect(item.querySelector('h3')?.textContent).toBe('Write the report');
    });

    it('cancels with the Escape key', async () => {
      await openEditor(1);
      page
        .querySelector('li form')!
        .dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await fixture.whenStable();

      expect(page.querySelector('li form')).toBeNull();
    });

    it('does not save a blank title', async () => {
      await openEditor(1);
      type('#edit-title-1', '   ');
      page.querySelector('li form')!.dispatchEvent(new Event('submit'));
      await fixture.whenStable();

      http.expectNone('/api/tasks/1');
      expect(field('edit-title-1').getAttribute('aria-invalid')).toBe('true');
      expect(page.querySelector('#edit-title-error-1')?.textContent).toContain(
        'Informe o título da tarefa.',
      );
    });
  });
});
