import {
  Component,
  Injector,
  OnInit,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { UNREACHABLE_MESSAGE, httpStatus, isUnreachable } from '../shared/http-errors';
import { createTaskForm, revealErrors, showFieldError, taskFormValue } from './task-form';
import { TaskItem } from './task-item';
import { Task, TaskChanges } from './task.model';
import { TaskService } from './task.service';

/**
 * Home page: shows every registered task and lets the user add, edit, complete and delete them.
 * It owns the list state and the API calls; each card (TaskItem) only reports what the user did.
 */
@Component({
  selector: 'app-task-list-page',
  imports: [ReactiveFormsModule, TaskItem],
  templateUrl: './task-list-page.html',
  styleUrl: './task-list-page.scss',
})
export class TaskListPage implements OnInit {
  private readonly taskService = inject(TaskService);
  private readonly injector = inject(Injector);

  protected readonly tasks = signal<Task[]>([]);
  protected readonly completedCount = computed(
    () => this.tasks().filter((t) => t.completed).length,
  );
  protected readonly pendingCount = computed(() => this.tasks().length - this.completedCount());
  protected readonly loading = signal(true);
  protected readonly loadFailed = signal(false);
  /** Message about the last action that failed (create, update, delete), shown in an alert. */
  protected readonly actionError = signal<string | null>(null);
  protected readonly saving = signal(false);
  /** Ids of the tasks with a request in flight (their controls stay disabled meanwhile). */
  protected readonly busyIds = signal<ReadonlySet<number>>(new Set());
  /** The task being edited inline, if any (one at a time). */
  protected readonly editingId = signal<number | null>(null);

  protected readonly form = createTaskForm(inject(NonNullableFormBuilder));
  protected readonly showError = showFieldError;

  ngOnInit() {
    this.loadTasks();
  }

  protected loadTasks() {
    this.loading.set(true);
    this.loadFailed.set(false);
    this.taskService
      .list()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (tasks) => this.tasks.set(tasks),
        error: () => this.loadFailed.set(true),
      });
  }

  protected addTask() {
    if (this.form.invalid) {
      revealErrors(this.form);
      return;
    }
    this.actionError.set(null);
    this.saving.set(true);
    this.taskService
      .create(taskFormValue(this.form))
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (task) => {
          // Newest first, matching the order the API returns.
          this.tasks.update((tasks) => [task, ...tasks]);
          this.form.reset();
        },
        // The form keeps what was typed, so the user can just try again.
        error: (error) => this.fail(error, 'Não foi possível adicionar a tarefa.'),
      });
  }

  protected setCompleted(task: Task, completed: boolean) {
    this.updateTask(task, { completed });
  }

  protected setEditing(task: Task, editing: boolean) {
    this.editingId.set(editing ? task.id : null);
  }

  protected saveEdit(task: Task, changes: TaskChanges) {
    this.updateTask(task, changes, () => this.editingId.set(null));
  }

  protected deleteTask(task: Task) {
    if (!confirm(`Excluir a tarefa "${task.title}"?`)) return;

    this.actionError.set(null);
    this.setBusy(task.id, true);
    this.taskService
      .remove(task.id)
      .pipe(finalize(() => this.setBusy(task.id, false)))
      .subscribe({
        next: () => this.dropTask(task),
        error: (error) => this.fail(error, 'Não foi possível excluir a tarefa.', task),
      });
  }

  protected dismissError() {
    this.actionError.set(null);
  }

  private updateTask(task: Task, changes: TaskChanges, onSaved?: () => void) {
    this.actionError.set(null);
    this.setBusy(task.id, true);
    this.taskService
      .update(task.id, changes)
      .pipe(finalize(() => this.setBusy(task.id, false)))
      .subscribe({
        next: (updated) => {
          this.tasks.update((tasks) => tasks.map((t) => (t.id === updated.id ? updated : t)));
          onSaved?.();
        },
        // The cards only show saved state, so a failure leaves them as they were.
        error: (error) => this.fail(error, 'Não foi possível salvar a alteração.', task),
      });
  }

  /** Explains a failed request; a task already deleted elsewhere (404) also leaves the list. */
  private fail(error: unknown, message: string, task?: Task) {
    if (task && httpStatus(error) === 404) {
      this.dropTask(task);
      this.actionError.set('Esta tarefa não existe mais e foi removida da lista.');
    } else if (isUnreachable(error)) {
      this.actionError.set(`${message} ${UNREACHABLE_MESSAGE}`);
    } else {
      this.actionError.set(`${message} Tente novamente.`);
    }
  }

  private dropTask(task: Task) {
    this.tasks.update((tasks) => tasks.filter((t) => t.id !== task.id));
    if (this.editingId() === task.id) this.editingId.set(null);
    // The focused button is gone with its task; keep keyboard users on the list.
    afterNextRender(() => document.getElementById('tasks-heading')?.focus(), {
      injector: this.injector,
    });
  }

  private setBusy(id: number, busy: boolean) {
    this.busyIds.update((ids) => {
      const next = new Set(ids);
      if (busy) next.add(id);
      else next.delete(id);
      return next;
    });
  }
}
