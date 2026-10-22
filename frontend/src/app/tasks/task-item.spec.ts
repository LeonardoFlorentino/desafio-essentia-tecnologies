import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TaskItem } from './task-item';
import { Task, TaskChanges, today } from './task.model';

const task: Task = {
  id: 4,
  title: 'Write the report',
  description: 'Quarterly numbers',
  completed: false,
  dueDate: null,
  priority: 'high',
  createdAt: '2026-10-22T12:00:00.000Z',
  updatedAt: '2026-10-22T12:00:00.000Z',
};

/**
 * The card on its own: it shows the task and only *reports* what the user did (outputs);
 * the page decides and calls the API. So no HTTP request may come from these interactions.
 */
describe('TaskItem', () => {
  let fixture: ComponentFixture<TaskItem>;
  let card: HTMLElement;
  let http: HttpTestingController;
  const emitted = {
    completed: [] as boolean[],
    editing: [] as boolean[],
    saved: [] as TaskChanges[],
    removed: 0,
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [TaskItem],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(TaskItem);
    card = fixture.nativeElement;
    Object.assign(emitted, { completed: [], editing: [], saved: [], removed: 0 });
    const item = fixture.componentInstance;
    item.completedChange.subscribe((value) => emitted.completed.push(value));
    item.editingChange.subscribe((value) => emitted.editing.push(value));
    item.save.subscribe((changes) => emitted.saved.push(changes));
    item.remove.subscribe(() => emitted.removed++);
    await setInputs({ task });
  });

  afterEach(() => http.verify());

  async function setInputs(
    inputs: Partial<Record<'task' | 'busy' | 'editing' | 'locked', unknown>>,
  ) {
    for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value);
    await fixture.whenStable();
  }

  const button = (label: string) =>
    card.querySelector<HTMLButtonElement>(`button[aria-label^="${label}"]`)!;
  const checkbox = () => card.querySelector<HTMLInputElement>('input[type=checkbox]')!;

  function type(selector: string, value: string, event = 'input') {
    const field = card.querySelector<HTMLInputElement | HTMLSelectElement>(selector)!;
    field.value = value;
    field.dispatchEvent(new Event(event));
  }

  describe('showing the task', () => {
    it('shows the title, description, status and priority', () => {
      expect(card.querySelector('h3')?.textContent).toBe('Write the report');
      expect(card.textContent).toContain('Quarterly numbers');
      expect(card.textContent).toContain('Pendente');
      expect(card.querySelector('.badge--high')?.textContent?.trim()).toBe('Prioridade alta');
    });

    it('strikes a completed task through and drops the due-date warnings', async () => {
      await setInputs({ task: { ...task, completed: true, dueDate: '2020-01-01' } });
      expect(card.querySelector('.task--completed')).not.toBeNull();
      expect(card.textContent).toContain('Concluída');
      expect(card.textContent).not.toContain('Atrasada');
    });

    it('flags an overdue task in text, not only in color', async () => {
      await setInputs({ task: { ...task, dueDate: '2020-01-05' } });
      expect(card.textContent).toContain('Prazo: 05/01/2020');
      expect(card.textContent).toContain('Atrasada');
      expect(card.querySelector('.task--overdue')).not.toBeNull();
    });

    it('flags a task due today', async () => {
      await setInputs({ task: { ...task, dueDate: today() } });
      expect(card.textContent).toContain('Vence hoje');
      expect(card.querySelector('.task--overdue')).toBeNull();
    });
  });

  describe('completing', () => {
    it('asks for the change instead of making it (the box only mirrors saved state)', async () => {
      checkbox().click();
      await fixture.whenStable();

      expect(emitted.completed).toEqual([true]);
      expect(checkbox().checked).toBe(false);
    });

    it('asks to reopen a completed task', async () => {
      await setInputs({ task: { ...task, completed: true } });
      checkbox().click();
      expect(emitted.completed).toEqual([false]);
    });

    it('locks the checkbox and the delete button while a request is in flight', async () => {
      await setInputs({ busy: true });
      expect(checkbox().disabled).toBe(true);
      expect(button('Excluir').disabled).toBe(true);
    });
  });

  describe('editing', () => {
    async function openEditor() {
      button('Editar').click();
      await setInputs({ editing: true });
    }

    it('asks to start editing and fills the form with the saved values', async () => {
      await setInputs({ task: { ...task, dueDate: '2026-11-05' } });
      await openEditor();

      expect(emitted.editing).toEqual([true]);
      expect(card.querySelector<HTMLInputElement>('#edit-title-4')!.value).toBe('Write the report');
      expect(card.querySelector<HTMLInputElement>('#edit-due-4')!.value).toBe('2026-11-05');
      expect(card.querySelector<HTMLSelectElement>('#edit-priority-4')!.value).toBe('high');
      expect(document.activeElement?.id).toBe('edit-title-4');
    });

    it('reports the edited values, trimmed, with blanks as null', async () => {
      await openEditor();
      type('#edit-title-4', '  Final report  ');
      type('#edit-description-4', '   ');
      type('#edit-priority-4', 'low', 'change');
      card.querySelector('form')!.dispatchEvent(new Event('submit'));

      expect(emitted.saved).toEqual([
        { title: 'Final report', description: null, dueDate: null, priority: 'low' },
      ]);
    });

    it('reports nothing for a blank title and explains why', async () => {
      await openEditor();
      type('#edit-title-4', '   ');
      card.querySelector('form')!.dispatchEvent(new Event('submit'));
      await fixture.whenStable();

      expect(emitted.saved).toEqual([]);
      expect(card.querySelector('#edit-title-error-4')?.textContent).toContain(
        'Informe o título da tarefa.',
      );
    });

    it.each([
      [
        'the Cancel button',
        () => card.querySelector<HTMLButtonElement>('form button[type=button]')!.click(),
      ],
      [
        'the Escape key',
        () =>
          card
            .querySelector('form')!
            .dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })),
      ],
    ])('asks to stop editing with %s', async (_how, cancel) => {
      await openEditor();
      cancel();
      expect(emitted.editing).toEqual([true, false]);
      expect(emitted.saved).toEqual([]);
    });

    it('returns the focus to "Editar" when editing ends', async () => {
      await openEditor();
      await setInputs({ editing: false });
      expect(document.activeElement?.id).toBe('edit-button-4');
    });

    it('cannot be opened while another task is being edited', async () => {
      await setInputs({ locked: true });
      expect(button('Editar').disabled).toBe(true);
      expect(button('Excluir').disabled).toBe(true);
    });
  });

  it('asks to delete the task', () => {
    button('Excluir').click();
    expect(emitted.removed).toBe(1);
  });

  it('opens and closes the details panel, which loads its own data only when opened', async () => {
    http.expectNone('/api/tasks/4/details');
    const details = button('Detalhes');
    expect(details.getAttribute('aria-expanded')).toBe('false');

    details.click();
    await fixture.whenStable();
    expect(details.getAttribute('aria-expanded')).toBe('true');
    http.expectOne('/api/tasks/4/details').flush({ notes: '', tags: [] });
    http.expectOne('/api/tasks/4/history').flush([]);
    await fixture.whenStable();
    expect(card.querySelector('#details-4')).not.toBeNull();

    button('Ocultar detalhes').click();
    await fixture.whenStable();
    expect(card.querySelector('#details-4')).toBeNull();
  });
});
