import { afterEach, describe, expect, it, jest } from '@jest/globals';

const original = { ...process.env };
const CA = '-----BEGIN CERTIFICATE-----\nMIIDummy\n-----END CERTIFICATE-----';

/** Loads src/config.ts afresh with the given variables. */
function loadConfig(env: Record<string, string>) {
  Object.assign(process.env, env);
  let loaded: { config: { db: { ssl?: unknown } } } | undefined;
  jest.isolateModules(() => {
    loaded = jest.requireActual('../../src/config');
  });
  return loaded!.config;
}

afterEach(() => {
  process.env = { ...original };
});

describe('MySQL TLS (managed databases such as Aiven)', () => {
  it('connects without TLS when no CA certificate is given (local Docker)', () => {
    delete process.env.DB_SSL_CA;
    expect(loadConfig({}).db.ssl).toBeUndefined();
  });

  it('verifies the server against the given CA certificate', () => {
    expect(loadConfig({ DB_SSL_CA: CA }).db.ssl).toEqual({ ca: CA, rejectUnauthorized: true });
  });

  it('accepts the certificate pasted on one line with literal \\n', () => {
    const oneLine = CA.replace(/\n/g, '\\n');
    expect(loadConfig({ DB_SSL_CA: oneLine }).db.ssl).toEqual({ ca: CA, rejectUnauthorized: true });
  });
});
