import { Component, Injector, OnInit, afterNextRender, inject, signal } from '@angular/core';
import { FormGroup, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { Task } from './task.model';
import { TaskService } from './task.service';

/** Home page: shows every registered task and lets the user add, edit, complete and delete them. */
@Component({
  selector: 'app-task-list-page',
  imports: [ReactiveFormsModule],
  templateUrl: './task-list-page.html',
  styleUrl: './task-list-page.scss',
})
export class TaskListPage implements OnInit {
  private readonly taskService = inject(TaskService);
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly injector = inject(Injector);

  protected readonly tasks = signal<Task[]>([]);
  protected readonly saving = signal(false);
  /** Ids of the tasks with a request in flight (their controls stay disabled meanwhile). */
  protected readonly busyIds = signal<ReadonlySet<number>>(new Set());
  /** The task being edited inline, if any (one at a time). */
  protected readonly editingId = signal<number | null>(null);

  protected readonly form = this.buildTaskForm();
  protected readonly editForm = this.buildTaskForm();

  ngOnInit() {
    this.taskService.list().subscribe((tasks) => this.tasks.set(tasks));
  }

  protected showError(form: FormGroup, field: 'title' | 'description') {
    const control = form.controls[field];
    return control.invalid && control.touched;
  }

  protected addTask() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.taskService
      .create(this.cleanValue(this.form))
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe((task) => {
        // Newest first, matching the order the API returns.
        this.tasks.update((tasks) => [task, ...tasks]);
        this.form.reset();
      });
  }

  protected toggleCompleted(task: Task, checkbox: HTMLInputElement) {
    this.setBusy(task.id, true);
    this.taskService
      .update(task.id, { completed: checkbox.checked })
      .pipe(finalize(() => this.setBusy(task.id, false)))
      .subscribe({
        next: (updated) => this.replaceTask(updated),
        // The browser already flipped the box; put it back so it matches the saved state.
        error: () => (checkbox.checked = task.completed),
      });
  }

  protected startEdit(task: Task) {
    this.editForm.reset({ title: task.title, description: task.description ?? '' });
    this.editingId.set(task.id);
    this.focusAfterRender(`edit-title-${task.id}`);
  }

  protected cancelEdit(task: Task) {
    this.editingId.set(null);
    this.focusAfterRender(`edit-button-${task.id}`);
  }

  protected saveEdit(task: Task) {
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }
    this.setBusy(task.id, true);
    this.taskService
      .update(task.id, this.cleanValue(this.editForm))
      .pipe(finalize(() => this.setBusy(task.id, false)))
      .subscribe((updated) => {
        this.replaceTask(updated);
        this.cancelEdit(task);
      });
  }

  protected deleteTask(task: Task) {
    if (!confirm(`Excluir a tarefa "${task.title}"?`)) return;

    this.setBusy(task.id, true);
    this.taskService
      .remove(task.id)
      .pipe(finalize(() => this.setBusy(task.id, false)))
      .subscribe(() => {
        this.tasks.update((tasks) => tasks.filter((t) => t.id !== task.id));
        // The focused button is gone with its task; keep keyboard users on the list.
        this.focusAfterRender('tasks-heading');
      });
  }

  // Same limits as the API; /\S/ rejects a title made only of spaces.
  private buildTaskForm() {
    return this.formBuilder.group({
      title: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(255)]],
      description: ['', Validators.maxLength(5000)],
    });
  }

  /** Trimmed title, and a blank description sent as null (stored as NULL by the API). */
  private cleanValue(form: ReturnType<TaskListPage['buildTaskForm']>) {
    const { title, description } = form.getRawValue();
    return { title: title.trim(), description: description.trim() || null };
  }

  private replaceTask(updated: Task) {
    this.tasks.update((tasks) => tasks.map((t) => (t.id === updated.id ? updated : t)));
  }

  /** Moves keyboard focus once the view reflects the new state (keyboard and screen reader users). */
  private focusAfterRender(elementId: string) {
    afterNextRender(() => document.getElementById(elementId)?.focus(), {
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
