import {
  Component,
  DestroyRef,
  Injector,
  OnInit,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, debounceTime, finalize, map, merge } from 'rxjs';
import { UNREACHABLE_MESSAGE, httpStatus, isUnreachable } from '../shared/http-errors';
import {
  DEFAULT_FILTERS,
  TaskFilters,
  filtersFromParams,
  filtersToParams,
  hasActiveFilters,
} from './task-filters';
import { createTaskForm, revealErrors, showFieldError, taskFormValue } from './task-form';
import { TaskItem } from './task-item';
import { PRIORITY_LABELS, PRIORITY_OPTIONS, Task, TaskChanges } from './task.model';
import { TaskService } from './task.service';

/** Time the search waits after the last keystroke before asking the API. */
const SEARCH_DEBOUNCE_MS = 300;

/**
 * Home page: shows every registered task and lets the user add, edit, complete and delete them,
 * and search, filter and sort the list (kept in the URL query string).
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
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private listRequest?: Subscription;

  /** The filters in effect: always the ones in the URL. */
  protected readonly filters = signal<TaskFilters>(DEFAULT_FILTERS);
  protected readonly filtered = computed(() => hasActiveFilters(this.filters()));
  protected readonly filterForm = inject(NonNullableFormBuilder).group({ ...DEFAULT_FILTERS });
  protected readonly priorityLabels = PRIORITY_LABELS;
  protected readonly priorityOptions = PRIORITY_OPTIONS;
  /** Polite message, e.g. a new task that the current filters hide. */
  protected readonly notice = signal<string | null>(null);

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
    // URL → filters → list. Also runs on load, so a reloaded or shared link shows the same list.
    this.route.queryParamMap
      .pipe(map(filtersFromParams), takeUntilDestroyed(this.destroyRef))
      .subscribe((filters) => {
        this.filters.set(filters);
        this.notice.set(null);
        // Leave the fields alone when they already mean the same (e.g. a trailing space being typed).
        const shown = filtersToParams(this.filterForm.getRawValue());
        if (JSON.stringify(shown) !== JSON.stringify(filtersToParams(filters))) {
          this.filterForm.setValue(filters, { emitEvent: false });
        }
        this.loadTasks();
      });

    // Fields → URL: the selects apply at once, the search after a pause in typing.
    const { search, status, priority, sort } = this.filterForm.controls;
    merge(
      search.valueChanges.pipe(debounceTime(SEARCH_DEBOUNCE_MS)),
      status.valueChanges,
      priority.valueChanges,
      sort.valueChanges,
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.applyFilters());
  }

  /** Puts the fields in the URL (replacing the history entry, so Back leaves the page). */
  protected applyFilters() {
    void this.router.navigate([], {
      queryParams: filtersToParams(this.filterForm.getRawValue()),
      replaceUrl: true,
    });
  }

  protected clearFilters() {
    this.filterForm.setValue({ ...DEFAULT_FILTERS }, { emitEvent: false });
    this.applyFilters();
    // The "clear" button is gone: keep keyboard users in the toolbar.
    afterNextRender(() => document.getElementById('filter-search')?.focus(), {
      injector: this.injector,
    });
  }

  /** `quiet` keeps the list on screen (no loading message) while it is fetched again. */
  protected loadTasks(quiet = false, onLoaded?: (tasks: Task[]) => void) {
    // Only the latest filters matter: an older request still in flight is dropped.
    this.listRequest?.unsubscribe();
    if (!quiet) {
      this.loading.set(true);
      this.loadFailed.set(false);
    }
    this.listRequest = this.taskService
      .list(this.filters())
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (tasks) => {
          this.tasks.set(tasks);
          onLoaded?.(tasks);
          if (quiet) this.focusListIfLost();
        },
        error: () => {
          if (!quiet) this.loadFailed.set(true);
        },
      });
  }

  protected addTask() {
    if (this.form.invalid) {
      revealErrors(this.form);
      return;
    }
    this.actionError.set(null);
    this.notice.set(null);
    this.saving.set(true);
    this.taskService
      .create(taskFormValue(this.form))
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (task) => {
          this.form.reset();
          if (!this.filtered()) {
            // Newest first, matching the order the API returns.
            this.tasks.update((tasks) => [task, ...tasks]);
            return;
          }
          // Filtered or sorted: only the API knows if and where the new task fits.
          this.loadTasks(true, (tasks) => {
            if (!tasks.some((t) => t.id === task.id)) {
              this.notice.set(
                `Tarefa "${task.title}" adicionada, mas ela não aparece com os filtros atuais.`,
              );
            }
          });
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
          // The change may take the task out of the filter or move it in the order.
          if (this.filtered()) this.loadTasks(true);
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
    this.focusListIfLost();
  }

  /** When the focused control left the page with its task, keep keyboard users on the list. */
  private focusListIfLost() {
    afterNextRender(
      () => {
        const focused = document.activeElement;
        if (!focused || focused === document.body) {
          document.getElementById('tasks-heading')?.focus();
        }
      },
      { injector: this.injector },
    );
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
