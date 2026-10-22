import { HttpErrorResponse } from '@angular/common/http';

/**
 * The API could not be reached: no response at all (0), or the proxy in front of it
 * (Angular dev server, nginx) answering for it — 502/503/504.
 */
const UNREACHABLE_STATUSES = new Set([0, 502, 503, 504]);

export function httpStatus(error: unknown): number | undefined {
  return error instanceof HttpErrorResponse ? error.status : undefined;
}

export function isUnreachable(error: unknown): boolean {
  const status = httpStatus(error);
  return status !== undefined && UNREACHABLE_STATUSES.has(status);
}

export const UNREACHABLE_MESSAGE = 'Sem conexão com o servidor; verifique se a API está no ar.';
