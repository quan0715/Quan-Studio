# Quan Studio

Next.js App Router skeleton with `shadcn/ui` and Notion-based CMS sync.

Preset reference:
- style: `lyra` (`radix-lyra`)
- theme: `amber`
- icon library: `hugeicons`
- font: `jetbrains-mono`

## Getting Started

```bash
npm install
npm run prisma:generate
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

```bash
npm run dev
npm run lint
npm run build
npm run prisma:generate
npm run prisma:migrate:dev
npm run prisma:migrate:deploy
npm run setup:notion:cms-db
npm run setup:notion:resume-db
```

## Docker Compose (Dev)

Create local env first:

```bash
cp docker/dev.env.example docker/dev.env
```

```bash
docker compose -f docker-compose.dev.yml up -d --build
docker compose -f docker-compose.dev.yml ps
```

Services:
- `next`: Next.js app
- `worker`: polls and processes queued Notion sync jobs
- `postgres`: PostgreSQL 16

Worker poll config (`docker/dev.env`):
- `NOTION_SYNC_ACTIVE_POLL_INTERVAL_MS`: poll interval when queue is active (default `1000`)
- `NOTION_SYNC_IDLE_POLL_INTERVAL_MS`: poll interval when queue is idle (default `15000`)
- `NOTION_ENV_DATABASE_ID`: `NOTION.ENV` database id used by Studio Notion settings test
- `NOTION_SOURCE_PAGE_ID`: Notion page id where Studio scans `child_database` blocks for model/source mapping
- `STUDIO_SESSION_SECRET`: session signing secret for Studio auth cookie

Studio login credentials are read from Notion `NOTION.ENV` (`KEY/VALUE`):
- `ADMIN_USER_NAME`
- `ADMIN_USER_PWD`

Notion setup scripts:
- Set `PARENT_PAGE_ID` in `docker/dev.env` (the parent Notion page where DB will be created)
- `npm run setup:notion:cms-db` creates the Articles database
- `npm run setup:notion:resume-db` creates the Resume database

Resume data source schema is fixed to:
- `Name`, `Section`, `Group`, `Summary`, `Date`, `Tags`, `Visibility`
- `Section Order`, `Group Order`, `Item Order`, `Logo`
- No legacy fallback fields are supported.
- Data source IDs are managed in Studio Settings (`/studio/settings/notion`) and stored in DB.

Health check:

```bash
curl http://localhost:${HOST_PORT:-3000}/api/health
```

## Production Deployment

### Prerequisites (server)

- `git`
- `docker`
- `docker compose`
- A cloned repo at your deploy path (example: `/opt/quan-studio`)

### Bootstrap

```bash
cp docker/prod.env.example docker/prod.env
```

Fill `docker/prod.env` with real values, especially:

- `POSTGRES_*`
- `DATABASE_URL`
- `NOTION_*`
- `CLOUDFLARED_TOKEN`
- `NEXT_PUBLIC_SITE_URL`

### Deploy command (manual)

```bash
./scripts/deploy-prod.sh /opt/quan-studio <git_sha_or_tag>
```

This command will:

1. `git fetch` + checkout target ref
2. Build production image from `Dockerfile`
3. Run `prisma migrate deploy`
4. Start `next + worker + postgres + cloudflared`
5. Run smoke checks:
   - `/api/health`
   - `/api/public/posts`
   - `/studio/posts`

### Rollback

```bash
./scripts/deploy-prod.sh /opt/quan-studio <previous_git_sha>
```

## CI/CD (GitHub Actions)

### CI (`.github/workflows/ci.yml`)

Triggered on `push` and `pull_request` to `main`.

Quality gates:

1. `npm run lint`
2. `npm run typecheck`
3. `npm run prisma:validate`
4. `npm run build`

### CD (`.github/workflows/cd-prod.yml`)

Triggered after `CI` completed with `success` on `main`.

Deploys over Tailscale SSH by uploading and executing `scripts/deploy-prod.sh`.

Required GitHub Secrets:

- `TS_OAUTH_CLIENT_ID`
- `TS_OAUTH_SECRET`
- `PROD_SSH_HOST`
- `PROD_SSH_USER`
- `PROD_DEPLOY_PATH`

`CLOUDFLARED_TOKEN` is runtime-only and should be set in server `docker/prod.env`.

### Local pre-push gate (Husky)

Push to `main` will be blocked locally if required GitHub Secrets are missing.

One-time setup:

```bash
npm install
gh auth login
```

Manual check:

```bash
npm run check:github-secrets
```

## Core Routes

Pages:
- `/`
- `/blog`
- `/blog/[slug]`
- `/studio`
- `/studio/login`
- `/studio/posts`
- `/studio/settings/notion`

APIs:
- `GET /api/public/posts`
- `GET /api/public/posts/[slug]`
- `GET /api/public/resume`
- `POST /api/studio/auth/login`
- `POST /api/studio/auth/logout`
- `GET /api/studio/posts`
- `GET /api/studio/notion/articles`
- `GET /api/studio/settings/notion/models`
- `POST /api/studio/settings/notion/models/refresh`
- `PATCH /api/studio/settings/notion/models/select-source`
- `GET /api/studio/settings/notion/schema-mapping`
- `PATCH /api/studio/settings/notion/schema-mapping`
- `GET /api/studio/sync-jobs`
- `POST /api/studio/sync-jobs`
- `POST /api/studio/sync-jobs/process-next`
- `POST /api/studio/sync-jobs/[id]/retry`
- `POST /api/integrations/notion/webhook/button`

## Current Architecture

- `src/app`
  - App Router pages and route handlers (`(site)`, `(studio)`, `api`)
- `src/domain`
  - Domain entities, rules, and repository interfaces (`post`, `notion-sync`)
- `src/application`
  - Use cases and application-level errors
- `src/infrastructure`
  - Prisma client, repository implementations, Notion API client, Studio auth
- `src/interface`
  - HTTP handler wrapper, validators, DTO mapping, dependency container
- `src/presentation`
  - UI components, feature modules, API clients, frontend types
- `prisma/schema.prisma`
  - Database schema (`posts`, `notion_sync_jobs`, `integration_configs`)
- `Dockerfile.dev` + `docker-compose.dev.yml`
  - Dev container stack (`next` + `worker` + `postgres`)

## Specs

- `spec/README.md`
- `spec/MVP_SPEC.md`
- `spec/FRONTEND_SPEC.md`
- `spec/BACKEND_SPEC.md`
- `spec/INFRA_SPEC.md`
- `spec/EDITOR_FORMAT_GUIDE.md`
