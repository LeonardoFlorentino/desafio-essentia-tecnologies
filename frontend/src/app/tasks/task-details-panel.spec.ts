import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Task, TaskEvent } from './task.model';
import { TaskDetailsPanel, parseTags } from './task-details-panel';

const task: Task = {
  id: 7,
  title: 'Write the report',
  description: null,
  completed: false,
  createdAt: '2026-10-22T12:00:00.000Z',
  updatedAt: '2026-10-22T12:00:00.000Z',
};

const history: TaskEvent[] = [
  {
    type: 'updated',
    changes: {
      title: { from: 'Draft', to: 'Write the report' },
      description: { from: null, to: 'Q3' },
    },
    at: '2026-10-22T12:05:00.000Z',
  },
  { type: 'created', at: '2026-10-22T12:00:00.000Z' },
];

describe('parseTags', () => {
  it('splits by comma, trims and drops empty entries', () => {
    expect(parseTags(' finance, urgent ,, ')).toEqual(['finance', 'urgent']);
    expect(parseTags('')).toEqual([]);
  });
});

describe('TaskDetailsPanel', () => {
  let fixture: ComponentFixture<TaskDetailsPanel>;
  let http: HttpTestingController;
  let page: HTMLElement;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [TaskDetailsPanel],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    fixture = TestBed.createComponent(TaskDetailsPanel);
    fixture.componentRef.setInput('task', task);
    http = TestBed.inject(HttpTestingController);
    page = fixture.nativeElement;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach(() => http.verify());

  async function load(details = { notes: 'Ask Ana', tags: ['finance', 'urgent'] }) {
    http.expectOne('/api/tasks/7/details').flush(details);
    http.expectOne('/api/tasks/7/history').flush(history);
    await fixture.whenStable();
  }

  function type(selector: string, value: string) {
    const field = page.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector)!;
    field.value = value;
    field.dispatchEvent(new Event('input'));
  }

  it('loads the notes and tags into the form and shows the saved tags', async () => {
    await load();

    expect(page.querySelector<HTMLTextAreaElement>('#notes-7')!.value).toBe('Ask Ana');
    expect(page.querySelector<HTMLInputElement>('#tags-7')!.value).toBe('finance, urgent');
    const chips = [...page.querySelectorAll('.details__tags li')].map((li) => li.textContent);
    expect(chips).toEqual(['finance', 'urgent']);
  });

  it('shows the history in plain words, with what changed in an edit', async () => {
    await load();

    const entries = page.querySelectorAll('.details__history ol > li');
    expect(entries).toHaveLength(2);
    expect(entries[0].textContent).toContain('Tarefa editada');
    expect(entries[0].textContent).toContain('Título: “Draft” → “Write the report”');
    expect(entries[0].textContent).toContain('Descrição: (vazio) → “Q3”');
    expect(entries[1].textContent).toContain('Tarefa criada');
    expect(entries[1].querySelector('time')?.getAttribute('datetime')).toBe(history[1].at);
  });

  it('saves notes and tags with PUT, shows what was stored and refreshes the history', async () => {
    await load();
    type('#notes-7', 'New notes');
    type('#tags-7', 'meeting,  Urgent, ');
    page.querySelector('form')!.dispatchEvent(new Event('submit'));

    const req = http.expectOne('/api/tasks/7/details');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ notes: 'New notes', tags: ['meeting', 'Urgent'] });
    req.flush({ notes: 'New notes', tags: ['meeting', 'Urgent'] });
    http
      .expectOne('/api/tasks/7/history')
      .flush([{ type: 'details_updated', at: task.updatedAt }, ...history]);
    await fixture.whenStable();

    expect(page.querySelector('[role=status]')?.textContent).toContain('Notas e tags salvas.');
    expect(page.querySelector<HTMLInputElement>('#tags-7')!.value).toBe('meeting, Urgent');
    expect(page.querySelector('.details__history li')?.textContent).toContain(
      'Notas e tags atualizadas',
    );
  });

  it('does not send more than 10 tags', async () => {
    await load();
    type('#tags-7', Array.from({ length: 11 }, (_, i) => `t${i}`).join(','));
    await fixture.whenStable();
    page.querySelector('form')!.dispatchEvent(new Event('submit'));

    http.expectNone('/api/tasks/7/details');
    expect(page.querySelector('#tags-error-7')?.textContent).toContain('Use no máximo 10 tags.');
  });

  it('reloads the history when the task changes in the card', async () => {
    await load();
    fixture.componentRef.setInput('task', { ...task, completed: true });
    await fixture.whenStable();

    http.expectOne('/api/tasks/7/history').flush([{ type: 'completed', at: task.updatedAt }]);
    await fixture.whenStable();
    expect(page.querySelector('.details__history li')?.textContent).toContain(
      'Marcada como concluída',
    );
  });

  it('explains a failed load and retries', async () => {
    http.expectOne('/api/tasks/7/details').flush(null, { status: 500, statusText: 'Error' });
    http.expectOne('/api/tasks/7/history').flush(history);
    await fixture.whenStable();

    page.querySelector<HTMLButtonElement>('[role=alert] button')!.click();
    // Only the details are fetched again; the history had already arrived.
    http.expectOne('/api/tasks/7/details').flush({ notes: 'Ask Ana', tags: [] });
    await fixture.whenStable();
    expect(page.querySelector('[role=alert]')).toBeNull();
    expect(page.querySelector<HTMLTextAreaElement>('#notes-7')!.value).toBe('Ask Ana');
  });
});
