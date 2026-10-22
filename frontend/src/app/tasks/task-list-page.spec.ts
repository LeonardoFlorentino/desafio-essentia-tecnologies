import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Task } from './task.model';
import { TaskListPage } from './task-list-page';

const tasks: Task[] = [
  {
    id: 2,
    title: 'Call the client',
    description: null,
    completed: true,
    dueDate: null,
    priority: 'medium',
    createdAt: '2026-10-22T13:00:00.000Z',
    updatedAt: '2026-10-22T13:00:00.000Z',
  },
  {
    id: 1,
    title: 'Write the report',
    description: 'Quarterly numbers',
    completed: false,
    dueDate: null,
    priority: 'medium',
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
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
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

  function summary() {
    return Object.fromEntries(
      [...page.querySelectorAll('.summary div')].map((pair) => [
        pair.querySelector('dt')!.textContent!.trim(),
        pair.querySelector('dd')!.textContent!.trim(),
      ]),
    );
  }

  it('counts all, pending and completed tasks', () => {
    expect(summary()).toEqual({ Total: '2', Pendentes: '1', Concluídas: '1' });
  });

  it('updates the counts when a task is completed', async () => {
    checkboxOf(1).click();
    http.expectOne('/api/tasks/1').flush({ ...tasks[1], completed: true });
    await fixture.whenStable();

    expect(summary()).toEqual({ Total: '2', Pendentes: '0', Concluídas: '2' });
  });

  it('creates a task, shows it first and clears the form', async () => {
    type('#new-task-title', '  Send the proposal  ');
    type('#new-task-description', 'By email');
    submit();

    const req = http.expectOne('/api/tasks');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      title: 'Send the proposal',
      description: 'By email',
      dueDate: null,
      priority: 'medium',
    });
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
    expect(req.request.body).toEqual({
      title: 'Only a title',
      description: null,
      dueDate: null,
      priority: 'medium',
    });
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
    expect(item.querySelector('.task')!.classList).toContain('task--completed');
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
    expect(item.querySelector('.task')!.classList).not.toContain('task--completed');
    expect(item.textContent).toContain('Pendente');
  });

  it('puts the checkbox back when the API refuses the change', async () => {
    checkboxOf(1).click();
    http.expectOne('/api/tasks/1').flush(null, { status: 500, statusText: 'Server Error' });
    await fixture.whenStable();

    expect(checkboxOf(1).checked).toBe(false);
    expect(page.querySelectorAll('li')[1].textContent).toContain('Pendente');
    expect(page.querySelector('[role=alert]')?.textContent).toContain(
      'Não foi possível salvar a alteração. Tente novamente.',
    );
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

  it('does not flag the title just because it was tabbed through while empty', async () => {
    const input = page.querySelector<HTMLInputElement>('#new-task-title')!;
    input.dispatchEvent(new Event('focus'));
    input.dispatchEvent(new Event('blur'));
    await fixture.whenStable();

    expect(input.getAttribute('aria-invalid')).not.toBe('true');
    expect(page.querySelector('#new-task-title-error')).toBeNull();
  });

  it('flags the title once something was typed and erased', async () => {
    type('#new-task-title', 'x');
    type('#new-task-title', '');
    page.querySelector('#new-task-title')!.dispatchEvent(new Event('blur'));
    await fixture.whenStable();

    expect(page.querySelector('#new-task-title-error')?.textContent).toContain(
      'Informe o título da tarefa.',
    );
  });

  describe('deleting', () => {
    function deleteButtonOf(item: number) {
      return page
        .querySelectorAll('li')
        [item].querySelector<HTMLButtonElement>('button[aria-label^="Excluir"]')!;
    }

    afterEach(() => vi.restoreAllMocks());

    it('asks for confirmation naming the task', () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
      deleteButtonOf(1).click();
      expect(confirmSpy).toHaveBeenCalledWith('Excluir a tarefa "Write the report"?');
    });

    it('deletes the task with DELETE and removes it from the list when confirmed', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      deleteButtonOf(1).click();

      const req = http.expectOne('/api/tasks/1');
      expect(req.request.method).toBe('DELETE');
      req.flush(null, { status: 204, statusText: 'No Content' });
      await fixture.whenStable();

      const items = page.querySelectorAll('li');
      expect(items).toHaveLength(1);
      expect(items[0].textContent).toContain('Call the client');
      expect(document.activeElement?.id).toBe('tasks-heading');
    });

    it('does nothing when the user gives up', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(false);
      deleteButtonOf(1).click();
      await fixture.whenStable();

      http.expectNone('/api/tasks/1');
      expect(page.querySelectorAll('li')).toHaveLength(2);
    });
  });

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
      expect(req.request.body).toEqual({
        title: 'Write the final report',
        description: null,
        dueDate: null,
        priority: 'medium',
      });
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
      [...page.querySelectorAll<HTMLButtonElement>('li form button')]
        .find((b) => b.textContent?.trim() === 'Cancelar')!
        .click();
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

  describe('when the API fails', () => {
    const serverError = { status: 500, statusText: 'Server Error' };

    function alertText() {
      return page.querySelector('[role=alert]')?.textContent ?? '';
    }

    afterEach(() => vi.restoreAllMocks());

    it('explains a failed creation and keeps what was typed', async () => {
      type('#new-task-title', 'Send the proposal');
      submit();
      http.expectOne('/api/tasks').flush(null, serverError);
      await fixture.whenStable();

      expect(alertText()).toContain('Não foi possível adicionar a tarefa. Tente novamente.');
      expect(page.querySelectorAll('li')).toHaveLength(2);
      expect(page.querySelector<HTMLInputElement>('#new-task-title')!.value).toBe(
        'Send the proposal',
      );
      expect(page.querySelector<HTMLButtonElement>('form > button')!.disabled).toBe(false);
    });

    it('explains a failed edit and keeps the form open', async () => {
      page.querySelector<HTMLButtonElement>('#edit-button-1')!.click();
      await fixture.whenStable();
      type('#edit-title-1', 'New title');
      page.querySelector('li form')!.dispatchEvent(new Event('submit'));
      http.expectOne('/api/tasks/1').flush(null, serverError);
      await fixture.whenStable();

      expect(alertText()).toContain('Não foi possível salvar a alteração. Tente novamente.');
      expect(page.querySelector<HTMLInputElement>('#edit-title-1')!.value).toBe('New title');
    });

    it('explains a failed deletion and keeps the task', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      page.querySelector<HTMLButtonElement>('[aria-label="Excluir: Write the report"]')!.click();
      http.expectOne('/api/tasks/1').flush(null, serverError);
      await fixture.whenStable();

      expect(alertText()).toContain('Não foi possível excluir a tarefa. Tente novamente.');
      expect(page.querySelectorAll('li')).toHaveLength(2);
    });

    it('drops a task that no longer exists (404) and says so', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      page.querySelector<HTMLButtonElement>('[aria-label="Excluir: Write the report"]')!.click();
      http.expectOne('/api/tasks/1').flush(null, { status: 404, statusText: 'Not Found' });
      await fixture.whenStable();

      expect(alertText()).toContain('Esta tarefa não existe mais');
      expect(page.querySelectorAll('li')).toHaveLength(1);
    });

    it('says the server is unreachable when there is no connection', async () => {
      checkboxOf(1).click();
      http.expectOne('/api/tasks/1').error(new ProgressEvent('error'), { status: 0 });
      await fixture.whenStable();

      expect(alertText()).toContain('Sem conexão com o servidor');
    });

    it.each([502, 503, 504])(
      'also says the server is unreachable when the proxy answers %i',
      async (status) => {
        checkboxOf(1).click();
        http.expectOne('/api/tasks/1').flush(null, { status, statusText: 'Proxy Error' });
        await fixture.whenStable();

        expect(alertText()).toContain('Sem conexão com o servidor');
      },
    );

    it('lets the user dismiss the message, and clears it on the next action', async () => {
      checkboxOf(1).click();
      http.expectOne('/api/tasks/1').flush(null, serverError);
      await fixture.whenStable();

      page.querySelector<HTMLButtonElement>('[role=alert] button')!.click();
      await fixture.whenStable();
      expect(page.querySelector('[role=alert]')).toBeNull();

      checkboxOf(1).click();
      http.expectOne('/api/tasks/1').flush(null, serverError);
      await fixture.whenStable();
      checkboxOf(1).click();
      await fixture.whenStable();
      expect(page.querySelector('[role=alert]')).toBeNull();
      http.expectOne('/api/tasks/1').flush({ ...tasks[1], completed: true });
    });
  });
});
