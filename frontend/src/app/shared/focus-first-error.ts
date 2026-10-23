import { Directive, ElementRef, Injector, afterNextRender, inject } from '@angular/core';

/**
 * After a submit that reveals errors, moves the focus to the first invalid field: a screen reader
 * then reads its label and its error (aria-describedby), instead of nothing happening on the button.
 * A valid submit leaves no field with aria-invalid, so the focus stays where it was.
 */
@Directive({
  selector: 'form[appFocusFirstError]',
  host: { '(submit)': 'focusFirstError()' },
})
export class FocusFirstError {
  private readonly form = inject<ElementRef<HTMLFormElement>>(ElementRef);
  private readonly injector = inject(Injector);

  protected focusFirstError() {
    afterNextRender(
      () => this.form.nativeElement.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(),
      { injector: this.injector },
    );
  }
}
