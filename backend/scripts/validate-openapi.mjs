// Fails when docs/openapi.yaml is not a valid OpenAPI document (part of `npm run lint`).
// A plain Node script: the validator is an ES module, which Jest (CommonJS here) cannot load.
import SwaggerParser from '@apidevtools/swagger-parser';

const file = new URL('../docs/openapi.yaml', import.meta.url);

try {
  const api = await SwaggerParser.validate(
    decodeURIComponent(file.pathname.replace(/^\/(\w:)/, '$1')),
  );
  console.log(
    `docs/openapi.yaml: valid OpenAPI ${api.openapi} (${Object.keys(api.paths).length} paths)`,
  );
} catch (error) {
  console.error(`docs/openapi.yaml is not valid: ${error.message}`);
  process.exit(1);
}
