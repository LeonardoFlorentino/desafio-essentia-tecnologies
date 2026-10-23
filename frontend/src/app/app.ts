import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { AuthService } from './auth/auth.service';
import { ThemeService } from './shared/theme';

@Component({
  imports: [RouterLink, RouterOutlet],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  protected readonly auth = inject(AuthService);
  protected readonly themes = inject(ThemeService);
  private readonly router = inject(Router);

  protected logout() {
    this.auth.logout().subscribe(() => this.router.navigateByUrl('/login'));
  }
}
