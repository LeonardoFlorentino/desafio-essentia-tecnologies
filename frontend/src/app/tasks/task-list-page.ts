import { Component, OnInit, inject, signal } from '@angular/core';
import { Task } from './task.model';
import { TaskService } from './task.service';

/** Home page: shows every registered task. */
@Component({
  selector: 'app-task-list-page',
  templateUrl: './task-list-page.html',
  styleUrl: './task-list-page.scss',
})
export class TaskListPage implements OnInit {
  private readonly taskService = inject(TaskService);

  protected readonly tasks = signal<Task[]>([]);

  ngOnInit() {
    this.taskService.list().subscribe((tasks) => this.tasks.set(tasks));
  }
}
