import {
  Component,
  Injector,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { TaskDetailsPanel } from './task-details-panel';
import {
  createTaskForm,
  revealErrors,
  showFieldError,
  taskFormValue,
  taskToForm,
} from './task-form';
import {
  PRIORITY_LABELS,
  PRIORITY_OPTIONS,
  Task,
  TaskChanges,
  dueState,
  formatDay,
} from './task.model';

/**
 * One task card: shows the task and its controls, and owns the inline edit form.
 * It never calls the API — it reports what the user did and the page decides.
 */
@Component({
  selector: 'app-task-item',
  imports: [ReactiveFormsModule, TaskDetailsPanel],
  templateUrl: './task-item.html',
  styleUrl: './task-item.scss',
})
export class TaskItem {
  private readonly injector = inject(Injector);

  readonly task = input.required<Task>();
  /** A request for this task is in flight. */
  readonly busy = input(false);
  /** This task is open for editing. */
  readonly editing = input(false);
  /** Another task is being edited (only one at a time). */
  readonly locked = input(false);

  readonly completedChange = output<boolean>();
  readonly editingChange = output<boolean>();
  readonly save = output<TaskChanges>();
  readonly remove = output<void>();

  /** Notes, tags and history open below the card. */
  protected readonly expanded = signal(false);

  protected readonly form = createTaskForm(inject(NonNullableFormBuilder));
  protected readonly showError = showFieldError;
  protected readonly priorityLabels = PRIORITY_LABELS;
  protected readonly priorityOptions = PRIORITY_OPTIONS;
  protected readonly formatDay = formatDay;
  /** "overdue" / "today" for a pending task with a due date (checked against the user's today). */
  protected readonly due = computed(() => dueState(this.task()));

  constructor() {
    // Keyboard focus follows the mode: into the title when editing starts, back to "Editar" when it ends.
    let wasEditing = false;
    effect(() => {
      const editing = this.editing();
      if (editing === wasEditing) return;
      wasEditing = editing;
      const id = this.task().id;
      this.focusAfterRender(editing ? `edit-title-${id}` : `edit-button-${id}`);
    });
  }

  /** The checkbox only mirrors the saved state: the click asks for the change instead of making it. */
  protected requestToggle(event: Event) {
    event.preventDefault();
    this.completedChange.emit(!this.task().completed);
  }

  protected startEdit() {
    this.form.reset(taskToForm(this.task()));
    this.editingChange.emit(true);
  }

  protected cancelEdit() {
    this.editingChange.emit(false);
  }

  protected submitEdit() {
    if (this.form.invalid) {
      revealErrors(this.form);
      return;
    }
    this.save.emit(taskFormValue(this.form));
  }

  private focusAfterRender(elementId: string) {
    afterNextRender(() => document.getElementById(elementId)?.focus(), {
      injector: this.injector,
    });
  }
}
