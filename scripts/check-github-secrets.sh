#!/usr/bin/env bash
set -euo pipefail

REMOTE_NAME="${1:-origin}"

required_secrets=(
  "TS_OAUTH_CLIENT_ID"
  "TS_OAUTH_SECRET"
  "PROD_SSH_HOST"
  "PROD_SSH_USER"
  "PROD_DEPLOY_PATH"
)

if ! command -v gh >/dev/null 2>&1; then
  echo "[secrets-check] gh CLI is required. Install from https://cli.github.com/" >&2
  exit 1
fi

if ! gh auth status -h github.com >/dev/null 2>&1; then
  echo "[secrets-check] gh auth is required. Run: gh auth login" >&2
  exit 1
fi

remote_url="$(git remote get-url "${REMOTE_NAME}" 2>/dev/null || true)"
if [ -z "${remote_url}" ]; then
  echo "[secrets-check] git remote '${REMOTE_NAME}' not found." >&2
  exit 1
fi

repo_slug="$(printf '%s\n' "${remote_url}" | sed -E 's#^(git@|ssh://git@|https://)github.com[:/]##; s#\.git$##')"
if ! printf '%s\n' "${repo_slug}" | grep -Eq '^[^/]+/[^/]+$'; then
  echo "[secrets-check] unsupported GitHub remote URL: ${remote_url}" >&2
  exit 1
fi

if ! secret_names="$(gh secret list --repo "${repo_slug}" --json name --jq '.[].name')"; then
  echo "[secrets-check] cannot read secrets for ${repo_slug}. Check repo permission for gh token." >&2
  exit 1
fi

missing=()
for key in "${required_secrets[@]}"; do
  if ! printf '%s\n' "${secret_names}" | grep -qx "${key}"; then
    missing+=("${key}")
  fi
done

if [ "${#missing[@]}" -gt 0 ]; then
  echo "[secrets-check] missing required GitHub Secrets in ${repo_slug}:" >&2
  printf '  - %s\n' "${missing[@]}" >&2
  exit 1
fi

echo "[secrets-check] required GitHub Secrets are configured for ${repo_slug}."
