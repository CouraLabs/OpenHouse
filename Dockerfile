# The API image. Build it from the repository root:
#
#   docker build -t openhouse-api .
#
# or let the compose stack build it: `docker compose up --build`.

# `node:24-alpine` is the LTS line the repository's `engines` allows.
FROM node:24-alpine AS base
WORKDIR /app

# Installs the whole workspace and builds the API with Turbo, which builds
# `@workspace/db` first because `build` depends on it.
FROM base AS builder
COPY package.json package-lock.json turbo.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/db/package.json packages/db/
COPY packages/ui/package.json packages/ui/
RUN npm ci
COPY . .
RUN npm run build -- --filter=api

# Runs the built API on production dependencies only. Copying the workspaces'
# manifests — and not their sources — is what lets `npm ci` recreate the
# `node_modules/@workspace/db` link into the `packages/db` the next lines fill
# with the built package.
FROM base AS runner
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/db/package.json packages/db/
COPY packages/ui/package.json packages/ui/
RUN npm ci --omit=dev
COPY --from=builder /app/apps/api/dist apps/api/dist
COPY --from=builder /app/packages/db/dist packages/db/dist

EXPOSE 3000
CMD ["node", "apps/api/dist/main.js"]
