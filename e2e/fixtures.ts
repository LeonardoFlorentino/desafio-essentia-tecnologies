import { test as base, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';

export interface Account {
  email: string;
  password: string;
}

/** A unique, not yet registered account: tests never share data. */
export function newAccount(): Account {
  return { email: `e2e-${randomUUID().slice(0, 8)}@techx.com`, password: 'e2e-password-123' };
}

export const test = base.extend<{ account: Account; signedIn: Account }>({
  account: async ({}, use) => {
    await use(newAccount());
  },
  // Signs up through the API (page.request shares the browser's cookies, so the page is signed
  // in too) — for tests about something other than the sign-up form itself.
  signedIn: async ({ page, account }, use) => {
    const res = await page.request.post('/api/auth/register', { data: account });
    expect(res.status()).toBe(201);
    await use(account);
  },
});

export { expect };
