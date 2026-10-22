import { afterEach, describe, expect, it, jest } from '@jest/globals';

const original = { ...process.env };
const exampleSecret = 'dev-only-secret-change-me-in-production-0123456789';

/** Loads src/config.ts afresh with the given variables (it validates them at import time). */
function loadConfig(env: Record<string, string>) {
  Object.assign(process.env, env);
  jest.isolateModules(() => {
    jest.requireActual('../../src/config');
  });
}

afterEach(() => {
  process.env = { ...original };
});

describe('JWT_SECRET checks at startup', () => {
  it('refuses a secret shorter than 32 characters', () => {
    expect(() => loadConfig({ JWT_SECRET: 'short' })).toThrow('at least 32 characters');
  });

  it('refuses the example secrets from the repository in production', () => {
    expect(() => loadConfig({ NODE_ENV: 'production', JWT_SECRET: exampleSecret })).toThrow(
      'example value',
    );
  });

  it('accepts them in development (that is what .env.example is for)', () => {
    expect(() => loadConfig({ NODE_ENV: 'development', JWT_SECRET: exampleSecret })).not.toThrow();
  });

  it('accepts a random secret in production', () => {
    expect(() =>
      loadConfig({ NODE_ENV: 'production', JWT_SECRET: 'q8Vt0rZ2mW5xYc7Lp1Ns3Hk9Bf4Dj6Ge' }),
    ).not.toThrow();
  });
});
