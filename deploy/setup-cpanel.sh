#!/usr/bin/env bash

# Groomy Paws - cPanel/Hostinger setup helper
# This script builds the frontend, installs backend deps, writes env files,
# creates SPA routing .htaccess, symlinks uploads, and restarts the Node app.
#
# Usage:
#   bash deploy/setup-cpanel.sh [path/to/env]
#
# If env path is omitted, defaults to deploy/cpanel.env.

set -euo pipefail

log() {
  printf '\n[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$1"
}

warn() {
  printf '\n[WARN %s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$1" >&2
}

fatal() {
  printf '\n[ERROR %s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$1" >&2
  exit 1
}

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE_ARG="${1:-}"
if [[ -n "${ENV_FILE_ARG}" ]]; then
  ENV_FILE="${ENV_FILE_ARG}"
else
  ENV_FILE="${PROJECT_ROOT}/deploy/cpanel.env"
fi

if [[ ! -f "${ENV_FILE}" ]]; then
  fatal "Config file not found: ${ENV_FILE}. Copy deploy/cpanel.env.example and update it."
fi

log "Loading configuration from ${ENV_FILE}"
set -o allexport
# shellcheck disable=SC1090
source "${ENV_FILE}"
set +o allexport

# Defaults & required values
APP_DOMAIN="${APP_DOMAIN:-}"
HOME_DIR="${HOME}"
WEB_ROOT="${WEB_ROOT:-${HOME_DIR}/public_html/groomy-paws}"
SERVER_DIR="${WEB_ROOT}/server"
DIST_DIR="${WEB_ROOT}/dist"
PORT="${PORT:-3001}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-3306}"
DB_NAME="${DB_NAME:-groomy_paws}"
DB_USER="${DB_USER:-groomy_app}"
DB_PASSWORD="${DB_PASSWORD:-}"
JWT_SECRET="${JWT_SECRET:-}"
VITE_API_URL="${VITE_API_URL:-}"

prompt_required() {
  local var_name="$1"; shift
  local prompt_msg="$1"; shift
  local is_secret="${1:-false}"
  local val
  if [[ "${is_secret}" == "true" ]]; then
    read -r -s -p "${prompt_msg}: " val; echo
  else
    read -r -p "${prompt_msg}: " val
  fi
  printf -v "$var_name" '%s' "$val"
}

if [[ -z "${APP_DOMAIN}" ]]; then
  prompt_required APP_DOMAIN "Enter APP_DOMAIN (e.g., example.com)" false
fi
if [[ -z "${DB_PASSWORD}" ]]; then
  prompt_required DB_PASSWORD "Enter DB_PASSWORD (MySQL user password)" true
fi
if [[ -z "${JWT_SECRET}" ]]; then
  prompt_required JWT_SECRET "Enter JWT_SECRET (long random string)" true
fi

if [[ -z "${VITE_API_URL}" ]]; then
  VITE_API_URL="https://${APP_DOMAIN}/api"
fi

# If the repo is not already at WEB_ROOT, sync it there
if [[ "${PROJECT_ROOT}" != "${WEB_ROOT}" ]]; then
  log "Syncing repository to ${WEB_ROOT}"
  mkdir -p "${WEB_ROOT}"
  rsync -a --delete \
    --exclude '.git' \
    --exclude 'node_modules' \
    --exclude 'dist' \
    "${PROJECT_ROOT}/" "${WEB_ROOT}/"
fi

# Ensure expected directories
mkdir -p "${SERVER_DIR}" "${DIST_DIR}"

# Frontend: install deps, write env, build
log "Installing frontend dependencies"
if [[ -f "${WEB_ROOT}/package-lock.json" ]]; then
  (cd "${WEB_ROOT}" && npm ci)
else
  (cd "${WEB_ROOT}" && npm install)
fi

log "Writing .env.production for Vite"
cat > "${WEB_ROOT}/.env.production" <<EOF
VITE_API_URL=${VITE_API_URL}
EOF

log "Building frontend (vite build)"
(cd "${WEB_ROOT}" && npm run build)

# Backend: install deps, write env
log "Installing backend dependencies"
if [[ -f "${SERVER_DIR}/package-lock.json" ]]; then
  (cd "${SERVER_DIR}" && npm ci --omit=dev)
else
  (cd "${SERVER_DIR}" && npm install --omit=dev)
fi

log "Writing backend env (server/.env)"
cat > "${SERVER_DIR}/.env" <<EOF
DB_HOST=${DB_HOST}
DB_PORT=${DB_PORT}
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}
DB_NAME=${DB_NAME}
PORT=${PORT}
JWT_SECRET=${JWT_SECRET}
NODE_ENV=production
EOF

# Uploads: ensure and link for Apache to serve when Node is at /api
log "Ensuring upload directories and symlink"
mkdir -p "${SERVER_DIR}/uploads/profiles" "${SERVER_DIR}/uploads/pets"
ln -sf "${SERVER_DIR}/uploads" "${DIST_DIR}/uploads"

# Write SPA .htaccess into dist (overwrites if exists)
log "Writing SPA .htaccess into ${DIST_DIR}"
cat > "${DIST_DIR}/.htaccess" <<'EOF'
RewriteEngine On

# Serve existing files/folders
RewriteCond %{REQUEST_FILENAME} -f [OR]
RewriteCond %{REQUEST_FILENAME} -d
RewriteRule ^ - [L]

# Exclude API routes (handled by Passenger/Node mounted at /api)
RewriteCond %{REQUEST_URI} !^/api/ [NC]

# Fallback other routes to index.html
RewriteRule ^ index.html [L]

<IfModule mod_headers.c>
  # Optional: cache static assets
  <FilesMatch "\.(js|css|png|jpg|jpeg|gif|svg|woff2?)$">
    Header set Cache-Control "max-age=31536000, public"
  </FilesMatch>
</IfModule>
EOF

# Restart Node app via Passenger
log "Requesting Node app restart (Passenger)"
mkdir -p "${SERVER_DIR}/tmp"
: > "${SERVER_DIR}/tmp/restart.txt"

log "Setup complete!"
cat <<SUMMARY

Frontend directory : ${DIST_DIR}
Backend directory  : ${SERVER_DIR}
Domain             : https://${APP_DOMAIN}
API base URL       : ${VITE_API_URL}

Health check:
  curl https://${APP_DOMAIN}/api/health

If this is the first deployment, create an admin account with:
  cd ${SERVER_DIR} && node create-admin.js

SUMMARY
