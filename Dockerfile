# The images of the stack, one target each. Build them from the repository
# root, or let `docker compose up --build` build all three:
#
#   docker build --target api     -t openhouse-api .
#   docker build --target migrate -t openhouse-migrate .
#   docker build --target web     -t openhouse-web .

# `node:24-alpine` is the LTS line the repository's `engines` allows.
FROM node:24-alpine AS base
WORKDIR /app

# Every workspace's manifest: `npm ci` installs the workspaces the lockfile
# lists and links `node_modules/@workspace/*` to them, so none may be missing.
FROM base AS manifests
COPY package.json package-lock.json turbo.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY apps/landing/package.json apps/landing/
COPY packages/db/package.json packages/db/
COPY packages/poco/package.json packages/poco/
COPY packages/ui/package.json packages/ui/

# Installs the whole workspace and builds the API and the web app with Turbo,
# which builds `@workspace/db` and `@workspace/poco` first because `build`
# depends on them.
FROM manifests AS builder
RUN npm ci
COPY . .
RUN npm run build -- --filter=api --filter=web

# Applies the pending migrations and exits. It runs `drizzle-kit`, a dev
# dependency, so it starts from the builder rather than the slim runtime.
FROM builder AS migrate
ENV NODE_ENV=production
CMD ["npm", "run", "db:migrate", "--workspace=@workspace/db"]

# Runs the built API on production dependencies only. Copying the workspaces'
# manifests — and not their sources — is what lets `npm ci` recreate the
# `node_modules/@workspace/*` links into the packages the next lines fill
# with their built output.
FROM manifests AS api
ENV NODE_ENV=production
RUN npm ci --omit=dev
COPY --from=builder /app/apps/api/dist apps/api/dist
COPY --from=builder /app/packages/db/dist packages/db/dist
COPY --from=builder /app/packages/poco/dist packages/poco/dist

EXPOSE 3000
CMD ["node", "apps/api/dist/main.js"]

# Serves the static web build and proxies `/api` to the `api` service.
FROM nginx:1.29-alpine AS web
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

EXPOSE 80
