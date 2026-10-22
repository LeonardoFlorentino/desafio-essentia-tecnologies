import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../../src/app';
import { pool } from '../../src/db/mysql';
import { openApiSpec } from '../../src/http/docs';

const app = createApp();
const session = request.agent(app);

const METHODS = ['get', 'post', 'put', 'patch', 'delete'] as const;

beforeAll(async () => {
  await pool.query('DELETE FROM users');
  await session
    .post('/api/auth/register')
    .send({ email: 'docs@techx.com', password: 'docs-password' })
    .expect(201);
});

afterAll(async () => {
  await pool.end();
});

describe('OpenAPI document', () => {
  // Its validity against the OpenAPI standard is checked by `npm run lint` (scripts/validate-openapi.mjs).

  it('is served as JSON at /api/openapi.json', async () => {
    const res = await request(app).get('/api/openapi.json').expect(200);
    expect(res.body.info.title).toBe('TechX Tasks API');
  });

  it('is browsable in Swagger UI at /api/docs', async () => {
    const res = await request(app).get('/api/docs/').expect(200);
    expect(res.text).toContain('swagger-ui');
  });

  it('only documents operations that really exist in the API', async () => {
    const paths = openApiSpec.paths as Record<string, Record<string, unknown>>;
    const operations = Object.entries(paths).flatMap(([path, item]) =>
      METHODS.filter((method) => method in item).map((method) => ({ method, path })),
    );
    expect(operations.length).toBeGreaterThanOrEqual(13);

    // Logout ends the session; running it last keeps the other calls signed in, so a missing route
    // cannot hide behind a 401.
    operations.sort(
      (a, b) => Number(a.path === '/auth/logout') - Number(b.path === '/auth/logout'),
    );

    // A route that does not exist answers with the generic "Route not found" 404.
    const missing: string[] = [];
    for (const { method, path } of operations) {
      const res = await session[method](`/api${path.replace('{id}', '999999')}`).send({});
      if (String(res.body?.error).startsWith('Route not found')) {
        missing.push(`${method.toUpperCase()} ${path}`);
      }
    }
    expect(missing).toEqual([]);
  });
});
