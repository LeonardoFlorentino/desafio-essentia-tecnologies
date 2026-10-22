import { Component, Injector, afterNextRender, effect, inject, input, output } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { createTaskForm, showFieldError, taskFormValue } from './task-form';
import { Task, TaskChanges } from './task.model';

/**
 * One task card: shows the task and its controls, and owns the inline edit form.
 * It never calls the API — it reports what the user did and the page decides.
 */
@Component({
  selector: 'app-task-item',
  imports: [ReactiveFormsModule],
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

  protected readonly form = createTaskForm(inject(NonNullableFormBuilder));
  protected readonly showError = showFieldError;

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
    const { title, description } = this.task();
    this.form.reset({ title, description: description ?? '' });
    this.editingChange.emit(true);
  }

  protected cancelEdit() {
    this.editingChange.emit(false);
  }

  protected submitEdit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
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
