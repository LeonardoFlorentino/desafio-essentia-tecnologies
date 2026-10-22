import { NonNullableFormBuilder, Validators } from '@angular/forms';
import { NewTask } from './task.model';

/** Title/description form with the same limits as the API; /\S/ rejects a title of only spaces. */
export function createTaskForm(formBuilder: NonNullableFormBuilder) {
  return formBuilder.group({
    title: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(255)]],
    description: ['', Validators.maxLength(5000)],
  });
}

export type TaskForm = ReturnType<typeof createTaskForm>;

/** Trimmed title, and a blank description sent as null (stored as NULL by the API). */
export function taskFormValue(form: TaskForm): Required<NewTask> {
  const { title, description } = form.getRawValue();
  return { title: title.trim(), description: description.trim() || null };
}

export function showFieldError(form: TaskForm, field: 'title' | 'description') {
  const control = form.controls[field];
  return control.invalid && control.touched;
}
