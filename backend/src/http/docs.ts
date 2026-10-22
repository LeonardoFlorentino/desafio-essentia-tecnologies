import { readFileSync } from 'node:fs';
import path from 'node:path';
import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import { parse } from 'yaml';

// Same path from src/http (tsx) and dist/http (build): the spec lives in backend/docs.
const specPath = path.join(__dirname, '..', '..', 'docs', 'openapi.yaml');

/** The OpenAPI document, written by hand next to the code it describes. */
export const openApiSpec = parse(readFileSync(specPath, 'utf8')) as Record<string, unknown>;

/** `/api/docs` (Swagger UI, where the API can be tried out) and `/api/openapi.json` (raw spec). */
export const docsRouter = Router();

docsRouter.get('/openapi.json', (_req, res) => {
  res.json(openApiSpec);
});

docsRouter.use(
  '/docs',
  swaggerUi.serve,
  swaggerUi.setup(openApiSpec, {
    customSiteTitle: 'TechX Tasks API',
    // Requests from the page carry the session cookie (same origin), so "Try it out" works after login.
    swaggerOptions: { withCredentials: true, persistAuthorization: true },
  }),
);
