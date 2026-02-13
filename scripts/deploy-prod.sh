#!/usr/bin/env bash
set -euo pipefail

DEPLOY_PATH="${1:?Usage: deploy-prod.sh <deploy_path> <git_ref>}"
GIT_REF="${2:?Usage: deploy-prod.sh <deploy_path> <git_ref>}"

if ! command -v git >/dev/null 2>&1; then
  echo "git is required" >&2
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "docker is required" >&2
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "docker compose is required" >&2
  exit 1
fi

if [ ! -d "${DEPLOY_PATH}/.git" ]; then
  echo "${DEPLOY_PATH} is not a git repository. Clone the repo first." >&2
  exit 1
fi

cd "${DEPLOY_PATH}"

if [ ! -f "docker/prod.env" ]; then
  echo "Missing docker/prod.env. Create it from docker/prod.env.example." >&2
  exit 1
fi

require_env_key() {
  local key="$1"
  if ! grep -Eq "^${key}=.+" docker/prod.env; then
    echo "docker/prod.env is missing required key: ${key}" >&2
    exit 1
  fi
}

require_env_key "POSTGRES_USER"
require_env_key "POSTGRES_PASSWORD"
require_env_key "POSTGRES_DB"
require_env_key "DATABASE_URL"
require_env_key "NEXT_PUBLIC_SITE_URL"
require_env_key "CLOUDFLARED_TOKEN"

compose() {
  docker compose --env-file docker/prod.env -f docker-compose.prod.yml "$@"
}

echo "[deploy] fetch and checkout ${GIT_REF}"
git fetch --all --tags --prune
git checkout --force "${GIT_REF}"

if [ -f package-lock.json ]; then
  echo "[deploy] npm lockfile detected"
fi

echo "[deploy] start database"
compose up -d postgres

echo "[deploy] build image"
compose build next

echo "[deploy] apply migrations"
compose run --rm next npm run prisma:migrate:deploy

echo "[deploy] start services"
compose up -d --build --remove-orphans

check_path() {
  local path="$1"
  local max_attempts=30
  local attempt=1

  while [ "$attempt" -le "$max_attempts" ]; do
    if compose exec -T next node -e "fetch('http://127.0.0.1:3000${path}').then((res)=>{process.exit(res.ok?0:1)}).catch(()=>process.exit(1))" >/dev/null 2>&1; then
      echo "[deploy] smoke ok: ${path}"
      return 0
    fi

    sleep 2
    attempt=$((attempt + 1))
  done

  echo "[deploy] smoke failed: ${path}" >&2
  return 1
}

echo "[deploy] smoke checks"
check_path "/api/health"
check_path "/api/public/posts"
check_path "/studio/posts"

echo "[deploy] success"
