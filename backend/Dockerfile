# Build stage: compiles TypeScript, then keeps only the production dependencies.
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev

# Runtime stage: compiled JavaScript and production dependencies only, as a non-root user.
FROM node:24-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
COPY migrations ./migrations
COPY docs ./docs
COPY docker-start.sh ./
USER node
EXPOSE 3000
# Migrations, optional demo user (SEED_DEMO_USER=true) and the API; see docker-start.sh.
CMD ["sh", "docker-start.sh"]
