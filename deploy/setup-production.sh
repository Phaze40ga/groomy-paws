#!/usr/bin/env bash

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

to_bool() {
  local value="${1:-}"
  value="${value,,}"
  [[ "$value" == "true" || "$value" == "1" || "$value" == "yes" ]]
}

require_root() {
  if [[ "${EUID}" -ne 0 ]]; then
    fatal "This script must be run as root (try: sudo bash $0)"
  fi
}

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

ENV_FILE_ARG="${1:-}"
if [[ -n "${ENV_FILE_ARG}" ]]; then
  ENV_FILE="${ENV_FILE_ARG}"
else
  ENV_FILE="${ENV_FILE:-${PROJECT_ROOT}/deploy/production.env}"
fi

if [[ ! -f "${ENV_FILE}" ]]; then
  fatal "Config file not found: ${ENV_FILE}. Copy deploy/production.env.example and update it."
fi

log "Loading configuration from ${ENV_FILE}"
set -o allexport
# shellcheck disable=SC1090
source "${ENV_FILE}"
set +o allexport

require_root

# Defaults & required values
NODE_MAJOR="${NODE_MAJOR:-20}"
APP_USER="${APP_USER:-groomy}"
APP_GROUP="${APP_GROUP:-${APP_USER}}"
APP_DIR="${APP_DIR:-${PROJECT_ROOT}}"
SERVICE_NAME="${SERVICE_NAME:-groomy-paws-api}"
SERVER_ENV_PATH="${SERVER_ENV_PATH:-/etc/groomy-paws/server.env}"
NGINX_SITE="${NGINX_SITE:-groomy-paws}"
INSTALL_MYSQL="${INSTALL_MYSQL:-true}"
CONFIGURE_MYSQL="${CONFIGURE_MYSQL:-true}"
RUN_MIGRATIONS="${RUN_MIGRATIONS:-true}"
INSTALL_NGINX="${INSTALL_NGINX:-true}"
INSTALL_CERTBOT="${INSTALL_CERTBOT:-false}"
PORT="${PORT:-3001}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-3306}"
DB_NAME="${DB_NAME:-groomy_paws}"
DB_USER="${DB_USER:-groomy_app}"
DB_PASSWORD="${DB_PASSWORD:-}"
MYSQL_SUPER_USER="${MYSQL_SUPER_USER:-root}"
MYSQL_SUPER_PASSWORD="${MYSQL_SUPER_PASSWORD:-}"
APP_DOMAIN="${APP_DOMAIN:-}"
VITE_API_URL="${VITE_API_URL:-}"
JWT_SECRET="${JWT_SECRET:-}"

[[ -z "${DB_PASSWORD}" ]] && fatal "DB_PASSWORD must be set in ${ENV_FILE}"
[[ -z "${JWT_SECRET}" ]] && fatal "JWT_SECRET must be set in ${ENV_FILE}"
[[ -z "${APP_DOMAIN}" ]] && fatal "APP_DOMAIN must be set in ${ENV_FILE}"
if to_bool "${INSTALL_CERTBOT}"; then
  [[ -z "${LETSENCRYPT_EMAIL:-}" ]] && fatal "LETSENCRYPT_EMAIL is required when INSTALL_CERTBOT=true"
fi

if [[ "${APP_DIR:0:1}" != "/" ]]; then
  fatal "APP_DIR must be an absolute path (current value: ${APP_DIR})"
fi

if [[ -z "${VITE_API_URL}" ]]; then
  VITE_API_URL="https://${APP_DOMAIN}/api"
fi

log "Ensuring base apt packages are installed"
APT_PACKAGES=(ca-certificates curl gnupg lsb-release build-essential git rsync default-mysql-client)
if to_bool "${INSTALL_NGINX}"; then
  APT_PACKAGES+=("nginx")
fi
if to_bool "${INSTALL_MYSQL}"; then
  APT_PACKAGES+=("mysql-server")
fi
if to_bool "${INSTALL_CERTBOT}"; then
  APT_PACKAGES+=("certbot" "python3-certbot-nginx")
fi

apt-get update
apt-get install -y --no-install-recommends "${APT_PACKAGES[@]}"

if ! command -v node >/dev/null 2>&1 || [[ "$(node -v | cut -d'.' -f1 | tr -d 'v')" -lt "${NODE_MAJOR}" ]]; then
  log "Installing Node.js ${NODE_MAJOR}.x"
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
  apt-get install -y nodejs
fi

if ! id -u "${APP_USER}" >/dev/null 2>&1; then
  log "Creating application user ${APP_USER}"
  useradd --system --create-home --shell /bin/bash "${APP_USER}"
fi

APP_HOME="$(eval echo "~${APP_USER}" 2>/dev/null || true)"
if [[ -z "${APP_HOME}" || ! -d "${APP_HOME}" ]]; then
  APP_HOME="/home/${APP_USER}"
  mkdir -p "${APP_HOME}"
  chown "${APP_USER}:${APP_GROUP}" "${APP_HOME}"
fi

mkdir -p "${APP_DIR}"

if [[ "${PROJECT_ROOT}" != "${APP_DIR}" ]]; then
  log "Syncing repository to ${APP_DIR}"
  rsync -a --delete \
    --exclude '.git' \
    --exclude 'node_modules' \
    --exclude 'dist' \
    "${PROJECT_ROOT}/" "${APP_DIR}/"
  PROJECT_ROOT="${APP_DIR}"
fi

chown -R "${APP_USER}:${APP_GROUP}" "${PROJECT_ROOT}"

run_as_app() {
  local cmd="$1"
  runuser -u "${APP_USER}" -- bash -lc "${cmd}"
}

log "Installing frontend dependencies"
if [[ -f "${PROJECT_ROOT}/package-lock.json" ]]; then
  run_as_app "cd ${PROJECT_ROOT@Q} && npm ci"
else
  run_as_app "cd ${PROJECT_ROOT@Q} && npm install"
fi

log "Writing frontend environment (.env.production)"
cat > "${PROJECT_ROOT}/.env.production" <<EOF
VITE_API_URL=${VITE_API_URL}
EOF
chown "${APP_USER}:${APP_GROUP}" "${PROJECT_ROOT}/.env.production"

log "Building frontend assets"
run_as_app "cd ${PROJECT_ROOT@Q} && npm run build"

log "Installing backend dependencies"
if [[ -f "${PROJECT_ROOT}/server/package-lock.json" ]]; then
  run_as_app "cd ${PROJECT_ROOT@Q}/server && npm ci --omit=dev"
else
  run_as_app "cd ${PROJECT_ROOT@Q}/server && npm install --omit=dev"
fi

log "Ensuring upload directories exist"
run_as_app "mkdir -p ${PROJECT_ROOT@Q}/server/uploads/profiles ${PROJECT_ROOT@Q}/server/uploads/pets"

if to_bool "${CONFIGURE_MYSQL}"; then
  log "Configuring MySQL database ${DB_NAME}"
  MYSQL_CMD=(mysql -h "${DB_HOST}" -P "${DB_PORT}" -u "${MYSQL_SUPER_USER}")
  if [[ -n "${MYSQL_SUPER_PASSWORD}" ]]; then
    MYSQL_CMD+=(-p"${MYSQL_SUPER_PASSWORD}")
  fi
  if [[ "${DB_HOST}" != "localhost" && "${DB_HOST}" != "127.0.0.1" ]]; then
    MYSQL_CMD+=(--protocol=TCP)
  fi

  DB_NAME_ESCAPED="$(printf '%s' "${DB_NAME}" | sed 's/`/``/g')"
  DB_USER_ESCAPED="$(printf '%s' "${DB_USER}" | sed "s/'/''/g")"
  DB_PASSWORD_ESCAPED="$(printf '%s' "${DB_PASSWORD}" | sed "s/'/''/g")"

  "${MYSQL_CMD[@]}" <<SQL
CREATE DATABASE IF NOT EXISTS \`${DB_NAME_ESCAPED}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '${DB_USER_ESCAPED}'@'%' IDENTIFIED WITH mysql_native_password BY '${DB_PASSWORD_ESCAPED}';
ALTER USER '${DB_USER_ESCAPED}'@'%' IDENTIFIED WITH mysql_native_password BY '${DB_PASSWORD_ESCAPED}';
GRANT ALL PRIVILEGES ON \`${DB_NAME_ESCAPED}\`.* TO '${DB_USER_ESCAPED}'@'%';
FLUSH PRIVILEGES;
SQL

  if to_bool "${RUN_MIGRATIONS}"; then
    log "Running database schema migrations"
    "${MYSQL_CMD[@]}" "${DB_NAME}" < "${PROJECT_ROOT}/mysql/schema.sql"
  fi
else
  warn "Skipping MySQL provisioning (CONFIGURE_MYSQL=false). Ensure the database exists."
fi

log "Writing backend environment to ${SERVER_ENV_PATH}"
mkdir -p "$(dirname "${SERVER_ENV_PATH}")"
cat > "${SERVER_ENV_PATH}" <<EOF
DB_HOST=${DB_HOST}
DB_PORT=${DB_PORT}
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}
DB_NAME=${DB_NAME}
PORT=${PORT}
JWT_SECRET=${JWT_SECRET}
NODE_ENV=production
EOF
chmod 640 "${SERVER_ENV_PATH}"
chown root:"${APP_GROUP}" "${SERVER_ENV_PATH}"

NODE_BIN="$(command -v node)"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"

log "Creating systemd service ${SERVICE_NAME}"
cat > "${SERVICE_FILE}" <<EOF
[Unit]
Description=Groomy Paws API
After=network.target mysql.service
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=${PROJECT_ROOT}/server
EnvironmentFile=${SERVER_ENV_PATH}
ExecStart=${NODE_BIN} src/index.js
Restart=always
RestartSec=5
User=${APP_USER}
Group=${APP_GROUP}
Environment=NODE_ENV=production
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

chmod 644 "${SERVICE_FILE}"
systemctl daemon-reload
systemctl enable --now "${SERVICE_NAME}"

if to_bool "${INSTALL_NGINX}"; then
  log "Configuring nginx reverse proxy (${NGINX_SITE})"
  NGINX_CONF="/etc/nginx/sites-available/${NGINX_SITE}"
  cat > "${NGINX_CONF}" <<EOF
server {
    listen 80;
    server_name ${APP_DOMAIN};

    root ${PROJECT_ROOT}/dist;
    index index.html;
    client_max_body_size 20M;

    location /api/ {
        proxy_pass http://127.0.0.1:${PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection keep-alive;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /uploads/ {
        proxy_pass http://127.0.0.1:${PORT};
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location / {
        try_files \$uri /index.html;
        add_header Cache-Control "no-cache";
    }
}
EOF

  ln -sf "${NGINX_CONF}" "/etc/nginx/sites-enabled/${NGINX_SITE}"
  if [[ -f /etc/nginx/sites-enabled/default ]]; then
    rm -f /etc/nginx/sites-enabled/default
  fi

  nginx -t
  systemctl reload nginx

  if to_bool "${INSTALL_CERTBOT}"; then
    log "Requesting Let's Encrypt certificate for ${APP_DOMAIN}"
    if ! certbot --nginx -d "${APP_DOMAIN}" --non-interactive --agree-tos -m "${LETSENCRYPT_EMAIL}" --redirect; then
      warn "Certbot failed. You can rerun it later with: certbot --nginx -d ${APP_DOMAIN}"
    fi
  fi
else
  warn "Skipping nginx configuration (INSTALL_NGINX=false)"
fi

log "Deployment complete!"
cat <<SUMMARY

Application directory : ${PROJECT_ROOT}
Systemd service       : ${SERVICE_NAME}
API status            : systemctl status ${SERVICE_NAME}
Frontend URL          : https://${APP_DOMAIN}
API base URL          : ${VITE_API_URL}

If this is the first deployment, create an admin account with:
  cd ${PROJECT_ROOT}/server && sudo -u ${APP_USER} node create-admin.js

SUMMARY

