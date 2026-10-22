import { describe, expect, it, jest } from '@jest/globals';
import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { HttpError, errorHandler, notFoundHandler } from '../../src/http/errors';

function handle(error: unknown) {
  const req = { id: 'req-1', log: { error: jest.fn() } } as unknown as Request & {
    log: { error: jest.Mock };
  };
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response & {
    status: jest.Mock;
    json: jest.Mock;
  };
  errorHandler(error, req, res, jest.fn() as unknown as NextFunction);
  return { status: res.status.mock.calls[0]![0], body: res.json.mock.calls[0]![0], req };
}

describe('errorHandler', () => {
  it('turns a validation error into 400 with the messages per field', () => {
    const result = z.object({ title: z.string({ error: 'Title is required' }) }).safeParse({});
    expect(handle(result.error)).toMatchObject({
      status: 400,
      body: { error: 'Validation failed', details: { title: ['Title is required'] } },
    });
  });

  it('puts errors about the whole body (not one field) under _errors', () => {
    const result = z
      .object({ a: z.string().optional() })
      .refine((v) => v.a, { error: 'Send a' })
      .safeParse({});
    expect(handle(result.error).body).toEqual({
      error: 'Validation failed',
      details: { _errors: ['Send a'] },
    });
  });

  it('answers an HttpError with its own status and message', () => {
    expect(handle(new HttpError(404, 'Task not found'))).toMatchObject({
      status: 404,
      body: { error: 'Task not found' },
    });
  });

  it.each([
    ['entity.parse.failed', 400, 'Malformed JSON body'],
    ['entity.too.large', 413, 'Request body too large'],
    ['encoding.unsupported', 415, 'unsupported charset'],
  ])('answers the body-parser error %s with %i', (type, status, message) => {
    const error = Object.assign(new Error('unsupported charset'), { type, status, expose: true });
    expect(handle(error)).toMatchObject({ status, body: { error: message } });
  });

  it('hides anything unexpected behind a 500 with the request id, logging the details', () => {
    const internal = Object.assign(new Error('ER_ACCESS_DENIED'), { sql: 'SELECT secret' });
    const { status, body, req } = handle(internal);

    expect(status).toBe(500);
    expect(body).toEqual({ error: 'Internal server error', requestId: 'req-1' });
    expect(req.log.error).toHaveBeenCalledWith({ err: internal }, 'unhandled error');
  });

  it('does not trust a body-parser-like error that must not be shown (expose: false)', () => {
    const error = Object.assign(new Error('internal detail'), {
      type: 'stream.not.readable',
      status: 500,
      expose: false,
    });
    expect(handle(error).body).toEqual({ error: 'Internal server error', requestId: 'req-1' });
  });
});

describe('notFoundHandler', () => {
  it('passes a 404 naming the method and path', () => {
    const next = jest.fn();
    notFoundHandler(
      { method: 'GET', path: '/api/nope' } as Request,
      {} as Response,
      next as unknown as NextFunction,
    );
    expect(next).toHaveBeenCalledWith(new HttpError(404, 'Route not found: GET /api/nope'));
  });
});
