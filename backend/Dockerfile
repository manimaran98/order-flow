# Production image. Targets:
#   runtime (default) - the API server, production deps only, runs as non-root
#   migrate           - one-off job that applies Prisma migrations, then exits
FROM node:22-alpine AS base
RUN npm install -g npm@11
WORKDIR /app

FROM base AS deps
COPY package*.json ./
RUN npm ci --ignore-scripts

FROM deps AS build
COPY . .
# Why: prisma.config.ts reads DATABASE_URL, but generating the client never connects.
RUN DATABASE_URL=postgresql://build-placeholder/unused npx prisma generate && npm run build

FROM base AS prod-deps
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts

FROM deps AS migrate
COPY prisma.config.ts ./
COPY prisma ./prisma
CMD ["npx", "prisma", "migrate", "deploy"]

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --chown=node:node package.json ./
COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
USER node
EXPOSE 4000
HEALTHCHECK --interval=15s --timeout=3s --start-period=20s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT:-4000}/health" > /dev/null || exit 1
CMD ["node", "dist/main.js"]
