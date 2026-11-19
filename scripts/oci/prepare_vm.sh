#!/usr/bin/env bash
# Prepare an Ubuntu 22.04/24.04 Oracle Cloud VM for LMCPAFM.
# Run as a normal user with sudo:
#   chmod +x scripts/oci/prepare_vm.sh
#   ./scripts/oci/prepare_vm.sh

set -euo pipefail

APP_ROOT="${APP_ROOT:-/opt/lmcpafm}"
DATA_DIR="${DATA_DIR:-/opt/lmcpafm/data}"

echo "==> Installing packages"
sudo apt-get update
sudo apt-get install -y ca-certificates curl git nginx certbot python3-certbot-nginx

if ! command -v docker >/dev/null 2>&1; then
  echo "==> Installing Docker"
  curl -fsSL https://get.docker.com | sudo sh
  sudo usermod -aG docker "$USER"
  echo "Log out and back in so Docker group membership applies."
fi

echo "==> Creating directories"
sudo mkdir -p "$APP_ROOT" "$DATA_DIR/form_b_attachments" "$DATA_DIR/project_signed_certificates"
sudo chown -R "$USER:$USER" "$APP_ROOT" "$DATA_DIR"

echo "==> Done."
echo "Next steps:"
echo "  1. Clone repo into $APP_ROOT"
echo "  2. cp .env.oracle.example .env && nano .env"
echo "  3. docker compose -f compose.yaml -f compose.postgres.yaml -f compose.prod.yaml -f compose.oracle.yaml --env-file .env up -d --build"
echo "  4. sudo cp deploy/nginx/lmcpafm-staging.conf /etc/nginx/sites-available/lmcpafm"
echo "  5. sudo ln -sf /etc/nginx/sites-available/lmcpafm /etc/nginx/sites-enabled/lmcpafm"
echo "  6. sudo nginx -t && sudo systemctl reload nginx"
echo "  7. sudo certbot --nginx -d your-domain.example"
