#!/usr/bin/env bash

set -euo pipefail

APP_DIR="/home/ubuntu/announcer-project-main"
SERVICE_NAME="announcer"
NGINX_SITE="annausung.com"

if [[ ! -d "$APP_DIR" ]]; then
  echo "App directory not found: $APP_DIR" >&2
  exit 1
fi

sudo apt update
sudo apt install -y python3 python3-venv python3-pip nginx nodejs npm

cd "$APP_DIR"

if [[ ! -f ".env" ]]; then
  echo ".env file is missing in $APP_DIR" >&2
  exit 1
fi

python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

cd "$APP_DIR/frontend"
npm install
npm run build

sudo cp "$APP_DIR/deploy/systemd/${SERVICE_NAME}.service" "/etc/systemd/system/${SERVICE_NAME}.service"
sudo cp "$APP_DIR/deploy/nginx/${NGINX_SITE}.conf" "/etc/nginx/sites-available/${NGINX_SITE}"

if [[ -L "/etc/nginx/sites-enabled/default" ]]; then
  sudo rm -f /etc/nginx/sites-enabled/default
fi

if [[ ! -L "/etc/nginx/sites-enabled/${NGINX_SITE}" ]]; then
  sudo ln -s "/etc/nginx/sites-available/${NGINX_SITE}" "/etc/nginx/sites-enabled/${NGINX_SITE}"
fi

sudo systemctl daemon-reload
sudo systemctl enable "$SERVICE_NAME"
sudo systemctl restart "$SERVICE_NAME"

sudo nginx -t
sudo systemctl reload nginx

echo
echo "Pre-SSL deployment completed."
echo "Next steps:"
echo "  1. Open ports 80 and 443 in Lightsail networking."
echo "  2. Point your domain DNS to the instance static IP."
echo "  3. Run certbot, then copy deploy/nginx/${NGINX_SITE}.ssl.conf into /etc/nginx/sites-available/${NGINX_SITE}."
