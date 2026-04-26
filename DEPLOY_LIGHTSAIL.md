# Lightsail Deployment

## DNS

Set these A records to `43.201.164.155`:

- `@` -> `43.201.164.155`
- `www` -> `43.201.164.155`

## Backend env

Create `.env` from `.env.example` and keep these values:

```env
SECRET_KEY=change-this-to-a-long-random-secret
ALLOWED_ORIGINS=https://annausung.com,https://www.annausung.com,http://43.201.164.155
INITIAL_ADMIN_USERNAMES=sabrinaia
API_PREFIX=/api
DATABASE_URL=sqlite:///./community.db
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760
APP_HOST=127.0.0.1
APP_PORT=8000
APP_RELOAD=false
SIGNUP_RATE_LIMIT_MAX_REQUESTS=3
SIGNUP_RATE_LIMIT_WINDOW_SECONDS=600
LOGIN_RATE_LIMIT_MAX_REQUESTS=5
LOGIN_RATE_LIMIT_WINDOW_SECONDS=60
UPLOAD_RATE_LIMIT_MAX_REQUESTS=10
UPLOAD_RATE_LIMIT_WINDOW_SECONDS=60
```

## Frontend env

Create `frontend/.env.production`:

```env
REACT_APP_API_URL=https://annausung.com/api
REACT_APP_MEDIA_URL=https://annausung.com
```

## Build frontend

```bash
cd frontend
npm install
npm run build
```

The nginx configs in this repository serve the frontend directly from `/home/ubuntu/announcer-project-main/frontend/build`, so no additional copy step is required after `npm run build`.
## Backend dependencies

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Systemd

Copy `deploy/systemd/announcer.service` to `/etc/systemd/system/announcer.service` and run:

```bash
sudo systemctl daemon-reload
sudo systemctl enable announcer
sudo systemctl start announcer
sudo systemctl status announcer
```

## Nginx

First copy the pre-SSL config `deploy/nginx/annausung.com.conf` to `/etc/nginx/sites-available/annausung.com` and link it:

```bash
sudo cp /home/ubuntu/announcer-project-main/deploy/nginx/annausung.com.conf /etc/nginx/sites-available/annausung.com
sudo ln -s /etc/nginx/sites-available/annausung.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

If the default nginx site is enabled, remove it first:

```bash
sudo rm -f /etc/nginx/sites-enabled/default
```

## Optional bootstrap script

For the pre-SSL setup, you can run the helper script after creating `.env`:

```bash
cd /home/ubuntu/announcer-project-main
bash deploy/setup_lightsail.sh
```
## HTTPS

```bash
sudo apt update
sudo apt install nginx certbot python3-certbot-nginx
sudo certbot --nginx -d annausung.com -d www.annausung.com
```

After certbot succeeds, replace the nginx config with the SSL version and reload:

```bash
sudo cp /home/ubuntu/announcer-project-main/deploy/nginx/annausung.com.ssl.conf /etc/nginx/sites-available/annausung.com
sudo nginx -t
sudo systemctl reload nginx
```

## Open ports

Allow:

- `80/tcp`
- `443/tcp`

You do not need to expose `8000` publicly because Nginx proxies to it internally.
