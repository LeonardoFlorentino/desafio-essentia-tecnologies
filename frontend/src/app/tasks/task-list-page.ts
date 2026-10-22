import { Component, OnInit, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { Task } from './task.model';
import { TaskService } from './task.service';

/** Home page: shows every registered task and lets the user add new ones. */
@Component({
  selector: 'app-task-list-page',
  imports: [ReactiveFormsModule],
  templateUrl: './task-list-page.html',
  styleUrl: './task-list-page.scss',
})
export class TaskListPage implements OnInit {
  private readonly taskService = inject(TaskService);

  protected readonly tasks = signal<Task[]>([]);
  protected readonly saving = signal(false);
  /** Ids of the tasks with a request in flight (their controls stay disabled meanwhile). */
  protected readonly busyIds = signal<ReadonlySet<number>>(new Set());

  // Same limits as the API; /\S/ rejects a title made only of spaces.
  protected readonly form = inject(NonNullableFormBuilder).group({
    title: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(255)]],
    description: ['', Validators.maxLength(5000)],
  });

  protected titleInvalid() {
    const title = this.form.controls.title;
    return title.invalid && title.touched;
  }

  ngOnInit() {
    this.taskService.list().subscribe((tasks) => this.tasks.set(tasks));
  }

  protected addTask() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { title, description } = this.form.getRawValue();
    this.saving.set(true);
    this.taskService
      .create({ title: title.trim(), description: description.trim() || null })
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
        next: (updated) =>
          this.tasks.update((tasks) => tasks.map((t) => (t.id === updated.id ? updated : t))),
        // The browser already flipped the box; put it back so it matches the saved state.
        error: () => (checkbox.checked = task.completed),
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
