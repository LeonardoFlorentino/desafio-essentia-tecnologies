import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, finalize, map, of, tap } from 'rxjs';

export interface User {
  id: number;
  email: string;
}

export interface Credentials {
  email: string;
  password: string;
}

const AUTH_URL = '/api/auth';

/**
 * Who is signed in. The session itself is an HttpOnly cookie the browser sends on its own:
 * this service never sees the token and stores nothing in localStorage — it only asks the API.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly user = signal<User | null>(null);

  readonly currentUser = this.user.asReadonly();
  readonly isLoggedIn = computed(() => this.user() !== null);

  /** Asks the API whether the session cookie is still valid; any failure counts as signed out. */
  loadSession(): Observable<User | null> {
    return this.http.get<{ user: User }>(`${AUTH_URL}/me`).pipe(
      map(({ user }) => user),
      catchError(() => of(null)),
      tap((user) => this.user.set(user)),
    );
  }

  login(credentials: Credentials): Observable<User> {
    return this.startSession(`${AUTH_URL}/login`, credentials);
  }

  /** Creates the account; the API signs the new user in right away. */
  register(credentials: Credentials): Observable<User> {
    return this.startSession(`${AUTH_URL}/register`, credentials);
  }

  /** Ends the session on the server (clears the cookie); locally it ends even if that request fails. */
  logout(): Observable<void> {
    return this.http.post<void>(`${AUTH_URL}/logout`, null).pipe(
      catchError(() => of(undefined)),
      finalize(() => this.clearSession()),
    );
  }

  /** Forgets the user locally — e.g. when the API answers 401 because the session expired. */
  clearSession() {
    this.user.set(null);
  }

  private startSession(url: string, credentials: Credentials): Observable<User> {
    return this.http.post<{ user: User }>(url, credentials).pipe(
      map(({ user }) => user),
      tap((user) => this.user.set(user)),
    );
  }
}
