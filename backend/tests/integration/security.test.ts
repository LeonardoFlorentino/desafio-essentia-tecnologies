import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../../src/app';
import { config } from '../../src/config';
import { pool } from '../../src/db/mysql';

const app = createApp();
const owner = request.agent(app);

beforeAll(async () => {
  await pool.query('DELETE FROM users');
  await owner
    .post('/api/auth/register')
    .send({ email: 'owner@techx.com', password: 'owner-password' })
    .expect(201);
});

afterAll(async () => {
  await pool.end();
});

describe('security headers', () => {
  it('are sent on API responses, without revealing the framework', async () => {
    const res = await request(app).get('/api/health');

    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('DENY');
    expect(res.headers['referrer-policy']).toBe('no-referrer');
    expect(res.headers['cross-origin-opener-policy']).toBe('same-origin');
    expect(res.headers['content-security-policy']).toBe(
      "default-src 'none';frame-ancestors 'none'",
    );
  });

  it('are also sent on errors', async () => {
    const res = await request(app).get('/api/nothing-here').expect(404);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('let the docs page load its own scripts and styles, and nothing from other sites', async () => {
    const res = await request(app).get('/api/docs/').expect(200);
    const csp = res.headers['content-security-policy'];

    expect(csp).toContain("script-src 'self'");
    expect(csp).toContain("style-src 'self' 'unsafe-inline'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).not.toMatch(/https?:|\*/);
    // Every script the page asks for is served by the API itself.
    const scripts = [...res.text.matchAll(/<script[^>]*src="([^"]+)"/g)].map((m) => m[1]);
    expect(scripts.length).toBeGreaterThan(0);
    for (const src of scripts) expect(src).not.toMatch(/^(https?:)?\/\//);
  });
});

describe('request body limit', () => {
  it('rejects a body above 100 kB with 413', async () => {
    const res = await owner
      .post('/api/tasks')
      .send({ title: 'Big', description: 'x'.repeat(101 * 1024) })
      .expect(413);

    expect(res.body).toEqual({ error: 'Request body too large' });
    const [rows] = await pool.query('SELECT COUNT(*) AS total FROM tasks WHERE title = ?', ['Big']);
    expect(rows).toEqual([{ total: 0 }]);
  });

  it('accepts the largest valid task details (10,000 characters of notes, even multi-byte)', async () => {
    const { body: task } = await owner.post('/api/tasks').send({ title: 'Notes' }).expect(201);
    await owner
      .put(`/api/tasks/${task.id}/details`)
      .send({ notes: '😀'.repeat(5000), tags: [] })
      .expect(200);
  });
});

describe('CORS', () => {
  it('allows the configured origin, with credentials', async () => {
    const res = await request(app).get('/api/health').set('Origin', config.corsOrigin);
    expect(res.headers['access-control-allow-origin']).toBe(config.corsOrigin);
    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });

  it('does not allow any other origin', async () => {
    const res = await request(app)
      .options('/api/tasks')
      .set('Origin', 'https://evil.example')
      .set('Access-Control-Request-Method', 'POST');
    expect(res.headers['access-control-allow-origin']).not.toBe('https://evil.example');
    expect(res.headers['access-control-allow-origin']).not.toBe('*');
  });
});
