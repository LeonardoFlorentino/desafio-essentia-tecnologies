import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { DateField } from './date-field';
import { today } from './dates';

@Component({
  imports: [ReactiveFormsModule, DateField],
  template: `
    <form (keydown.escape)="escapedForm = true">
      <label for="due">Prazo</label>
      <app-date-field inputId="due" [formControl]="due" />
    </form>
    <button id="outside">fora</button>
  `,
})
class Host {
  due = new FormControl('', { nonNullable: true });
  escapedForm = false;
}

describe('DateField', () => {
  let fixture: ComponentFixture<Host>;
  let host: Host;
  let page: HTMLElement;

  beforeEach(async () => {
    fixture = TestBed.createComponent(Host);
    host = fixture.componentInstance;
    page = fixture.nativeElement;
    document.body.appendChild(page);
    await fixture.whenStable();
  });

  afterEach(() => page.remove());

  const input = () => page.querySelector<HTMLInputElement>('#due')!;
  const toggle = () => page.querySelector<HTMLButtonElement>('[aria-label="Abrir calendário"]')!;
  const calendar = () => page.querySelector('[role=dialog]');
  const button = (name: string) =>
    [...page.querySelectorAll<HTMLButtonElement>('[role=dialog] button')].find(
      (b) => b.getAttribute('aria-label') === name || b.textContent?.trim() === name,
    )!;

  async function type(text: string) {
    input().value = text;
    input().dispatchEvent(new Event('input'));
    await fixture.whenStable();
  }

  async function openCalendar() {
    toggle().click();
    await fixture.whenStable();
  }

  describe('typing', () => {
    it('is named by its label and shows the "__/__/____" placeholder', () => {
      expect(page.querySelector('label')!.htmlFor).toBe(input().id);
      expect(input().placeholder).toBe('__/__/____');
      expect(input().getAttribute('inputmode')).toBe('numeric');
    });

    it('shows the value day/month/year', async () => {
      host.due.setValue('2026-08-19');
      await fixture.whenStable();
      expect(input().value).toBe('19/08/2026');
    });

    it('adds the slashes and sets the value only when the date is complete', async () => {
      await type('1908');
      expect(input().value).toBe('19/08');
      expect(host.due.value).toBe('');

      await type('19082026');
      expect(input().value).toBe('19/08/2026');
      expect(host.due.value).toBe('2026-08-19');
    });

    it('puts back the last valid date when leaving an impossible one (31/02)', async () => {
      host.due.setValue('2026-08-19');
      await type('31/02/2026');
      expect(host.due.value).toBe('2026-08-19');

      input().dispatchEvent(new Event('blur'));
      await fixture.whenStable();
      expect(input().value).toBe('19/08/2026');
      expect(host.due.touched).toBe(true);
    });

    it('erasing the text clears the value', async () => {
      host.due.setValue('2026-08-19');
      await type('');
      expect(host.due.value).toBe('');
    });

    it('follows the disabled state of the form control', async () => {
      host.due.disable();
      await fixture.whenStable();
      expect(input().disabled).toBe(true);
      expect(toggle().disabled).toBe(true);
    });
  });

  describe('calendar', () => {
    it('opens on the month of the value, in Portuguese, Sunday first', async () => {
      host.due.setValue('2026-08-19');
      await openCalendar();

      expect(toggle().getAttribute('aria-expanded')).toBe('true');
      expect(calendar()?.textContent).toContain('Agosto de 2026');
      const weekdays = [...page.querySelectorAll('.date-field__weekday')].map((w) => w.textContent);
      expect(weekdays).toEqual(['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']);
      const selected = button('19 de agosto de 2026');
      expect(selected.getAttribute('aria-pressed')).toBe('true');
      expect(document.activeElement).toBe(selected);
    });

    it('opens on the current month when empty, marking today', async () => {
      await openCalendar();
      const day = Number(today().slice(8));
      const todayButton = page.querySelector('[aria-current=date]')!;
      expect(todayButton.textContent?.trim()).toBe(String(day));
    });

    it('starts the month on the right weekday (1 Aug 2026 is a Saturday)', async () => {
      host.due.setValue('2026-08-19');
      await openCalendar();
      const grid = page.querySelector('.date-field__grid')!;
      // 7 weekday labels, then 6 blanks (Sun–Fri), then day 1.
      expect(grid.children[7 + 6]!.getAttribute('aria-label')).toBe('1 de agosto de 2026');
    });

    it('moves between months, across the year', async () => {
      host.due.setValue('2026-12-10');
      await openCalendar();
      button('Próximo mês').click();
      await fixture.whenStable();
      expect(calendar()?.textContent).toContain('Janeiro de 2027');

      button('Mês anterior').click();
      button('Mês anterior').click();
      await fixture.whenStable();
      expect(calendar()?.textContent).toContain('Novembro de 2026');
    });

    it('picks a day: sets the value, shows it, closes and returns the focus', async () => {
      host.due.setValue('2026-08-19');
      await openCalendar();
      button('25 de agosto de 2026').click();
      await fixture.whenStable();

      expect(host.due.value).toBe('2026-08-25');
      expect(input().value).toBe('25/08/2026');
      expect(calendar()).toBeNull();
      expect(document.activeElement).toBe(toggle());
    });

    it('"Hoje" picks today and "Limpar" empties the field', async () => {
      await openCalendar();
      button('Hoje').click();
      await fixture.whenStable();
      expect(host.due.value).toBe(today());

      await openCalendar();
      button('Limpar').click();
      await fixture.whenStable();
      expect(host.due.value).toBe('');
      expect(input().value).toBe('');
    });

    it('Esc closes the calendar without closing the form around it', async () => {
      await openCalendar();
      calendar()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await fixture.whenStable();

      expect(calendar()).toBeNull();
      expect(host.escapedForm).toBe(false);
    });

    it('closes on a click outside', async () => {
      await openCalendar();
      page.querySelector('#outside')!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      await fixture.whenStable();
      expect(calendar()).toBeNull();
    });
  });
});
