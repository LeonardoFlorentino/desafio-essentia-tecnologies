import { NonNullableFormBuilder, Validators } from '@angular/forms';
import { NewTask, Priority, Task } from './task.model';

/** Task form with the same limits as the API; /\S/ rejects a title of only spaces. */
export function createTaskForm(formBuilder: NonNullableFormBuilder) {
  return formBuilder.group({
    title: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(255)]],
    description: ['', Validators.maxLength(5000)],
    // app-date-field gives YYYY-MM-DD, or '' when empty.
    dueDate: [''],
    priority: ['medium' as Priority],
  });
}

export type TaskForm = ReturnType<typeof createTaskForm>;

/** Fills the form with a saved task (for editing). */
export function taskToForm(task: Task) {
  return {
    title: task.title,
    description: task.description ?? '',
    dueDate: task.dueDate ?? '',
    priority: task.priority,
  };
}

/** Trimmed title; a blank description or due date is sent as null (stored as NULL by the API). */
export function taskFormValue(form: TaskForm): Required<NewTask> {
  const { title, description, dueDate, priority } = form.getRawValue();
  return {
    title: title.trim(),
    description: description.trim() || null,
    dueDate: dueDate || null,
    priority,
  };
}

/**
 * An error shows once the user changed the field and left it, or tried to submit —
 * not merely because the field was tabbed through while still empty.
 */
export function showFieldError(form: TaskForm, field: 'title' | 'description') {
  const control = form.controls[field];
  return control.invalid && control.touched && control.dirty;
}

/** On a submit attempt, reveal every error at once (including fields never visited). */
export function revealErrors(form: TaskForm) {
  form.markAllAsTouched();
  form.markAllAsDirty();
}
