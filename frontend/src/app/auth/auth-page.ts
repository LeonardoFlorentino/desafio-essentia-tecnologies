import { Component, computed, inject, input, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { UNREACHABLE_MESSAGE, httpStatus, isUnreachable } from '../shared/http-errors';
import { AuthService } from './auth.service';

export type AuthMode = 'login' | 'register';

const TEXTS = {
  login: {
    heading: 'Entrar',
    submit: 'Entrar',
    submitting: 'Entrando…',
    passwordAutocomplete: 'current-password',
    switchQuestion: 'Ainda não tem conta?',
    switchLink: 'Criar conta',
    switchRoute: '/register',
  },
  register: {
    heading: 'Criar conta',
    submit: 'Criar conta',
    submitting: 'Criando conta…',
    passwordAutocomplete: 'new-password',
    switchQuestion: 'Já tem conta?',
    switchLink: 'Entrar',
    switchRoute: '/login',
  },
} as const;

/** Sign-in and sign-up share one form; the route says which one this is (`data: { mode }`). */
@Component({
  selector: 'app-auth-page',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './auth-page.html',
  styleUrl: './auth-page.scss',
})
export class AuthPage {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly mode = input<AuthMode>('login');
  /** `?expired=true`, set when the session ran out while the user was working. */
  readonly expired = input(false, {
    transform: (value: unknown) => value === true || value === 'true',
  });
  protected readonly texts = computed(() => TEXTS[this.mode()]);

  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = inject(NonNullableFormBuilder).group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  protected showError(field: 'email' | 'password') {
    const control = this.form.controls[field];
    return control.invalid && control.touched && control.dirty;
  }

  /** Sign-up also checks the API's password rule here, so the user hears about it before sending. */
  protected passwordTooShort() {
    return this.mode() === 'register' && this.form.controls.password.value.length < 8;
  }

  protected showPasswordTooShort() {
    const password = this.form.controls.password;
    return (
      this.passwordTooShort() &&
      password.touched &&
      password.dirty &&
      !password.hasError('required')
    );
  }

  protected submit() {
    if (this.form.invalid || this.passwordTooShort()) {
      this.form.markAllAsTouched();
      this.form.markAllAsDirty();
      return;
    }
    const { email, password } = this.form.getRawValue();
    const credentials = { email: email.trim(), password };
    const request =
      this.mode() === 'login'
        ? this.authService.login(credentials)
        : this.authService.register(credentials);

    this.error.set(null);
    this.submitting.set(true);
    request.pipe(finalize(() => this.submitting.set(false))).subscribe({
      next: () => this.router.navigateByUrl('/'),
      error: (error) => this.error.set(this.describe(error)),
    });
  }

  private describe(error: unknown): string {
    const status = httpStatus(error);
    if (status === 401) return 'E-mail ou senha inválidos.';
    if (status === 409) return 'Este e-mail já está cadastrado. Entre com ele ou use outro.';
    if (status === 429) return 'Muitas tentativas seguidas. Aguarde um minuto e tente novamente.';
    if (isUnreachable(error)) return UNREACHABLE_MESSAGE;
    return 'Não foi possível concluir. Tente novamente.';
  }
}
