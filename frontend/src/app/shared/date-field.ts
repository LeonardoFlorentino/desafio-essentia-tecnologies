import {
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  forwardRef,
  inject,
  input,
  signal,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import {
  MONTHS,
  WEEKDAYS,
  daysInMonth,
  formatDay,
  isoDay,
  maskDay,
  parseDay,
  today,
} from './dates';

/**
 * A date field in Brazilian format (dd/mm/aaaa), typed or picked from a calendar in Portuguese.
 * The browser's <input type="date"> follows the system language (an English calendar and
 * mm/dd/yyyy on many machines), so this one is ours.
 *
 * Works as a form control (formControlName); its value is what the API speaks: "YYYY-MM-DD",
 * or "" when empty.
 */
@Component({
  selector: 'app-date-field',
  templateUrl: './date-field.html',
  styleUrl: './date-field.scss',
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => DateField), multi: true },
  ],
  host: {
    '(document:mousedown)': 'closeIfOutside($event)',
    '(keydown.escape)': 'onEscape($event)',
  },
})
export class DateField implements ControlValueAccessor {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  /** Id of the text field, so the page's <label for="..."> names it. */
  readonly inputId = input.required<string>();

  /** The value, as the API wants it ("YYYY-MM-DD" or ""). */
  private readonly value = signal('');
  /** What the field shows while typing; may be incomplete ("25/1"). */
  protected readonly text = signal('');
  protected readonly disabled = signal(false);
  protected readonly open = signal(false);
  /** Month shown by the calendar (month 0–11). */
  protected readonly shown = signal({ year: 0, month: 0 });

  protected readonly weekdays = WEEKDAYS;
  protected readonly heading = computed(() => {
    const { year, month } = this.shown();
    return `${capitalize(MONTHS[month])} de ${year}`;
  });
  /** Blank cells before day 1 (the week starts on Sunday), then the days of the month. */
  protected readonly cells = computed(() => {
    const { year, month } = this.shown();
    const blanks = new Date(year, month, 1).getDay();
    const days = Array.from({ length: daysInMonth(year, month) }, (_, i) => {
      const iso = isoDay(year, month, i + 1);
      return { day: i + 1, iso, label: `${i + 1} de ${MONTHS[month]} de ${year}` };
    });
    return [...Array<null>(blanks).fill(null), ...days];
  });
  protected readonly selected = this.value.asReadonly();
  protected readonly today = today;

  private onChange?: (value: string) => void;
  private onTouched?: () => void;

  writeValue(value: string | null): void {
    this.value.set(value ?? '');
    this.text.set(value ? formatDay(value) : '');
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.disabled.set(disabled);
  }

  /** Masks as the user types; the value changes only when the text is a complete, real day. */
  protected onType(event: Event) {
    const field = event.target as HTMLInputElement;
    const masked = maskDay(field.value);
    field.value = masked;
    this.text.set(masked);
    if (masked === '') this.commit('');
    else {
      const iso = parseDay(masked);
      if (iso) this.commit(iso);
    }
  }

  /** Leaving an incomplete or impossible date (31/02) puts back the last valid one. */
  protected onBlur() {
    if (this.text() !== '' && !parseDay(this.text()))
      this.text.set(this.value() ? formatDay(this.value()) : '');
    this.onTouched?.();
  }

  protected toggle() {
    if (this.open()) {
      this.close();
      return;
    }
    const [year, month] = (this.value() || today()).split('-').map(Number);
    this.shown.set({ year: year!, month: month! - 1 });
    this.open.set(true);
    // Keyboard users land on the selected day (or today) inside the calendar.
    afterNextRender(
      () =>
        this.host.nativeElement
          .querySelector<HTMLButtonElement>('[aria-pressed="true"], .date-field__day--today')
          ?.focus(),
      { injector: this.injector },
    );
  }

  protected moveMonth(delta: number) {
    const { year, month } = this.shown();
    const next = new Date(year, month + delta, 1);
    this.shown.set({ year: next.getFullYear(), month: next.getMonth() });
  }

  protected pick(iso: string) {
    this.commit(iso);
    this.text.set(formatDay(iso));
    this.close();
  }

  protected clear() {
    this.commit('');
    this.text.set('');
    this.close();
  }

  /** Esc closes the calendar without also closing an edit form around the field. */
  protected onEscape(event: Event) {
    if (!this.open()) return;
    event.stopPropagation();
    this.close();
  }

  protected closeIfOutside(event: MouseEvent) {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) {
      this.open.set(false);
    }
  }

  /** Closes and gives the focus back to the calendar button. */
  protected close() {
    this.open.set(false);
    this.onTouched?.();
    this.host.nativeElement.querySelector<HTMLButtonElement>('.date-field__toggle')?.focus();
  }

  private commit(iso: string) {
    if (iso === this.value()) return;
    this.value.set(iso);
    this.onChange?.(iso);
  }
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
