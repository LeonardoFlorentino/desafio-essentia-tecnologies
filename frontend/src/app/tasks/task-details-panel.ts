import { DatePipe } from '@angular/common';
import { Component, OnInit, effect, inject, input, signal, untracked } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { UNREACHABLE_MESSAGE, isUnreachable } from '../shared/http-errors';
import { Task, TaskDetails, TaskEvent } from './task.model';
import { TaskService } from './task.service';

const MAX_TAGS = 10;
const MAX_TAG_LENGTH = 30;

const FIELD_NAMES = { title: 'Título', description: 'Descrição', completed: 'Situação' } as const;

const EVENT_LABELS: Record<TaskEvent['type'], string> = {
  created: 'Tarefa criada',
  updated: 'Tarefa editada',
  completed: 'Marcada como concluída',
  reopened: 'Marcada como pendente',
  details_updated: 'Notas e tags atualizadas',
  deleted: 'Tarefa excluída',
};

/** "a, b,, c " → ["a", "b", "c"] */
export function parseTags(text: string): string[] {
  return text
    .split(',')
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
}

function show(value: unknown): string {
  if (value === null || value === '') return '(vazio)';
  if (typeof value === 'boolean') return value ? 'concluída' : 'pendente';
  return `“${value}”`;
}

/**
 * Notes, tags (MongoDB) and history of one task, shown when the card is expanded.
 * It loads its own data only when opened, so the list never makes one request per task.
 */
@Component({
  selector: 'app-task-details-panel',
  imports: [ReactiveFormsModule, DatePipe],
  templateUrl: './task-details-panel.html',
  styleUrl: './task-details-panel.scss',
})
export class TaskDetailsPanel implements OnInit {
  private readonly taskService = inject(TaskService);

  readonly task = input.required<Task>();

  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly saveError = signal<string | null>(null);
  protected readonly savedNotice = signal(false);
  protected readonly savedTags = signal<string[]>([]);
  protected readonly history = signal<TaskEvent[]>([]);

  protected readonly form = inject(NonNullableFormBuilder).group({
    notes: ['', Validators.maxLength(10000)],
    tags: [''],
  });

  protected readonly labels = EVENT_LABELS;
  protected readonly fieldNames = FIELD_NAMES;
  protected readonly show = show;

  constructor() {
    // The card replaces the task object after an edit or a (un)completion: refresh the history.
    effect(() => {
      const id = this.task().id;
      untracked(() => this.loadHistory(id));
    });
  }

  ngOnInit() {
    this.loadDetails();
  }

  protected loadDetails() {
    this.loading.set(true);
    this.loadError.set(null);
    this.taskService
      .getDetails(this.task().id)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (details) => this.applyDetails(details),
        error: (error) =>
          this.loadError.set(
            isUnreachable(error) ? UNREACHABLE_MESSAGE : 'Não foi possível carregar os detalhes.',
          ),
      });
  }

  protected tagsProblem(): string | null {
    const tags = parseTags(this.form.controls.tags.value);
    if (tags.length > MAX_TAGS) return `Use no máximo ${MAX_TAGS} tags.`;
    if (tags.some((tag) => tag.length > MAX_TAG_LENGTH)) {
      return `Cada tag pode ter até ${MAX_TAG_LENGTH} caracteres.`;
    }
    return null;
  }

  protected save() {
    if (this.form.invalid || this.tagsProblem()) return;
    const { notes, tags } = this.form.getRawValue();
    this.saving.set(true);
    this.saveError.set(null);
    this.savedNotice.set(false);
    this.taskService
      .saveDetails(this.task().id, { notes, tags: parseTags(tags) })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (details) => {
          this.applyDetails(details);
          this.savedNotice.set(true);
          this.loadHistory(this.task().id);
        },
        error: (error) =>
          this.saveError.set(
            isUnreachable(error)
              ? UNREACHABLE_MESSAGE
              : 'Não foi possível salvar as notas e tags. Tente novamente.',
          ),
      });
  }

  /** The changed fields of an "updated" event, in a fixed order. */
  protected changesOf(event: TaskEvent) {
    return (['title', 'description', 'completed'] as const)
      .filter((field) => event.changes?.[field])
      .map((field) => ({ field, ...event.changes![field]! }));
  }

  private applyDetails(details: TaskDetails) {
    // The API trims and drops repeated tags: show what was actually stored.
    this.form.reset({ notes: details.notes, tags: details.tags.join(', ') });
    this.savedTags.set(details.tags);
  }

  private loadHistory(id: number) {
    this.taskService.getHistory(id).subscribe({
      next: (events) => this.history.set(events),
      // The history is secondary: if it fails, the notes and tags still work.
      error: () => this.history.set([]),
    });
  }
}
