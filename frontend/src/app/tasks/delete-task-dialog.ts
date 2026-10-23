import { Component, ElementRef, output, signal, viewChild } from '@angular/core';
import { Task } from './task.model';

/**
 * Asks before a task is deleted, in the browser's native modal <dialog>: the focus stays inside,
 * Esc cancels, the page behind is inert, and on close the focus returns to the button that opened it.
 * It only asks; the page that opens it does the deleting when `confirmed` fires.
 */
@Component({
  selector: 'app-delete-task-dialog',
  templateUrl: './delete-task-dialog.html',
})
export class DeleteTaskDialog {
  /** The task, when the person answers "Excluir tarefa" (not on Cancelar or Esc). */
  readonly confirmed = output<Task>();

  protected readonly task = signal<Task | null>(null);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private readonly cancelButton = viewChild.required<ElementRef<HTMLButtonElement>>('cancel');

  open(task: Task) {
    const dialog = this.dialog().nativeElement;
    this.task.set(task);
    // A closed dialog keeps its last returnValue: without this, Esc after an earlier "delete" would delete.
    dialog.returnValue = '';
    dialog.showModal();
    // The safe choice has the focus, so a quick Enter never deletes.
    this.cancelButton().nativeElement.focus();
  }

  protected answer(answer: 'delete' | 'cancel') {
    this.dialog().nativeElement.close(answer);
  }

  /** Runs on every way out of the dialog: the buttons, and Esc (which leaves returnValue empty). */
  protected onClose() {
    const task = this.task();
    this.task.set(null);
    if (task && this.dialog().nativeElement.returnValue === 'delete') this.confirmed.emit(task);
  }
}
