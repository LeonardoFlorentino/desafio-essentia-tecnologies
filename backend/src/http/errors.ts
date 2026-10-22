import type { ErrorRequestHandler, RequestHandler } from 'express';
import { z } from 'zod';

/** An error whose message is safe to send to the client with the given HTTP status. */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new HttpError(404, `Route not found: ${req.method} ${req.path}`));
};

// Errors raised by express.json() (body-parser) carry their own 4xx status.
interface BodyParserError extends Error {
  status: number;
  type: string;
  expose: boolean;
}
const BODY_ERROR_MESSAGES: Record<string, string> = {
  'entity.parse.failed': 'Malformed JSON body',
  'entity.too.large': 'Request body too large', // 413, above BODY_LIMIT
};
function isBodyParserError(error: unknown): error is BodyParserError {
  return typeof error === 'object' && error !== null && 'type' in error && 'expose' in error;
}

// Express recognizes an error handler by its four parameters, so `_next` must stay.
export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof z.ZodError) {
    const { formErrors, fieldErrors } = z.flattenError(error);
    res.status(400).json({
      error: 'Validation failed',
      details: formErrors.length > 0 ? { ...fieldErrors, _errors: formErrors } : fieldErrors,
    });
    return;
  }
  if (error instanceof HttpError) {
    res.status(error.status).json({ error: error.message });
    return;
  }
  if (isBodyParserError(error) && error.expose) {
    const message = BODY_ERROR_MESSAGES[error.type] ?? error.message;
    res.status(error.status).json({ error: message });
    return;
  }

  // Unexpected: log the details on the server, never send them (stack, SQL) to the client.
  console.error(error);
  res.status(500).json({ error: 'Internal server error' });
};
