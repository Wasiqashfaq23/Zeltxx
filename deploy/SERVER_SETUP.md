# Zeltxx production deployment runbook

One-time VPS setup to serve the Zeltxx SaaS app behind Nginx with HTTPS. The CI
workflow handles everything after this: `git push` to `main` rebuilds the
frontend with `VITE_API_URL`, rsyncs `Frontend/dist/` and `Backend/` to
`/var/www/zeltxx`, reinstalls prod deps, and `pm2 restart zeltxx-backend`.

Assumed layout:
- `app.yourdomain.com`  -> static SPA build (`/var/www/zeltxx/frontend`)
- `api.yourdomain.com`  -> Express + Socket.IO (`/var/www/zeltxx/backend`, port 5001, loopback only)

These files in `deploy/` are references you commit:
- `nginx-app.conf` (SPA static server with long-lived asset caching)
- `nginx-api.conf` (reverse proxy incl. Socket.IO `Upgrade` headers)

---

## 0. Prerequisites (outside this doc)

- Debian/Ubuntu VPS brand new (this runbook uses `apt`).
- One DNS A record per subdomain: `app` and `api` -> VPS public IP.
  Point them BEFORE installing certs.
- MongoDB is **Atlas** (your `MONGO_URI`): add the VPS public IP to the
  Atlas Network Access allowlist (or `0.0.0.0/0`).
- In Google Cloud Console, register the production redirect URI:
  `https://api.yourdomain.com/api/auth/google/callback`.

## 1. Base packages

```bash
ssh root@<vps-ip>
apt update && apt upgrade -y
apt install -y nginx certbot python3-certbot-nginx rsync ufw curl
```

### Node 22 + pnpm 11

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs
npm install -g pnpm@11
```

## 2. App directories + server-only `.env`

```bash
mkdir -p /var/www/zeltxx/frontend /var/www/zeltxx/backend
cd /var/www/zeltxx/backend
```

Write `/var/www/zeltxx/backend/.env` (this file exists ONLY on the server —
never commit it, never echo it into CI logs):

```
NODE_ENV=production
PORT=5001
MONGO_URI=<your_atlas_uri>
JWT_SECRET=<long_random_string>
GOOGLE_CLIENT_ID=<from_google_console>
GOOGLE_CLIENT_SECRET=<from_google_console>
GOOGLE_CALLBACK_URL=https://api.yourdomain.com/api/auth/google/callback
CLIENT_URL=https://app.yourdomain.com
CORS_ORIGINS=https://app.yourdomain.com
TRUST_PROXY=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=<your_email@gmail.com>
SMTP_PASS=<16-char app password>
SMTP_FROM="Zeltxx Platform <your_email@gmail.com>"
CLOUDINARY_CLOUD_NAME=<optional>
CLOUDINARY_API_KEY=<optional>
CLOUDINARY_API_SECRET=<optional>
```

`TRUST_PROXY=true` is required: Nginx terminates TLS, and the backend's rate
limiter / `req.ip` trust the `X-Forwarded-For` header Nginx sets.

## 3. First boot with PM2

```bash
cd /var/www/zeltxx/backend
pnpm install --prod --frozen-lockfile
pm2 start ecosystem.config.cjs --env production
pm2 save
pm2 startup            # prints a command for systemd; run the printed command
```

`ecosystem.config.cjs` is fork mode on purpose (Socket.IO presence/rooms and the
rate limiter are in-memory — do not switch to cluster mode without a Redis
adapter). A deploy restarts the process a few hundred ms; that is the intended
downtime.

Sanity check: `pm2 list` shows online, and
`curl -s http://127.0.0.1:5001/health` returns HTTP 200 with `"status":"ok"`
and `"db":"connected"`.

## 4. Nginx

```bash
# Copy from the checked-out repo location, e.g. scp from your machine:
#   scp deploy/nginx-app.conf root@<vps>:/etc/nginx/sites-available/zeltxx-app
#   scp deploy/nginx-api.conf root@<vps>:/etc/nginx/sites-available/zeltxx-api
ln -s /etc/nginx/sites-available/zeltxx-app /etc/nginx/sites-enabled/zeltxx-app
ln -s /etc/nginx/sites-available/zeltxx-api /etc/nginx/sites-enabled/zeltxx-api
rm -f /etc/nginx/sites-enabled/default
sed -i 's/app.yourdomain.com/app.YOURDOMAIN/g' /etc/nginx/sites-available/zeltxx-app
sed -i 's/api.yourdomain.com/api.YOURDOMAIN/g' /etc/nginx/sites-available/zeltxx-api
nginx -t && systemctl reload nginx
```

Port 5001 is never exposed to the world; Nginx proxies to `127.0.0.1:5001`.
Only `/socket.io/` needs the WebSocket upgrade headers (already in the conf).

## 5. HTTPS (Certbot)

```bash
certbot --nginx -d app.yourdomain.com -d api.yourdomain.com
```

Automates cert install + HTTP->HTTPS redirect for both server blocks. Test:
`curl https://api.yourdomain.com/health` returns 200.

## 6. Firewall

```bash
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

SSH + 80 + 443 only. From another host, `nc -vz <ip> 5001` must time out.

## 7. Monitoring

PM2 has no built-in HTTP check, so poll `/health` externally:

```bash
# cron: every minute, hit /health and log failures (returns 503 when Mongo is down)
echo '* * * * * curl -fsS -m 10 https://api.yourdomain.com/health >/dev/null 2>&1 || echo "$(date) health DOWN" >> /var/log/zeltxx-health.log' | crontab -
```

Or add the URL to UptimeRobot (external monitoring of `https://api.yourdomain.com/health`,
expected 200). Because `/health` returns 503 when Mongo is disconnected, both
the cron and CI's post-deploy gate will flag a DB outage.

## 8. GitHub secrets for the deploy workflow

`Settings > Secrets and variables > Actions`:
- `VITE_API_URL` = `https://api.yourdomain.com`
- `SSH_HOST` = VPS IP or `api` hostname reachable over SSH
- `SSH_USER` = the deploy user
- `SSH_PRIVATE_KEY` = a dedicated deploy key (e.g. `ssh-ed25519`, added to the
  user's `~/.ssh/authorized_keys`; verify `ssh-keyscan -H "$SSH_HOST"` matches).

## 9. Post-deploy verification

1. Push to `main`; the deploy job must pass all steps including "Post-deploy health check".
2. `curl https://api.yourdomain.com/health` -> 200, fresh `uptime`.
3. `curl https://app.yourdomain.com` -> serves the SPA; a hard refresh then a
   direct visit to `/project/xyz` serves `index.html` (SPA fallback).
4. Login end-to-end via Google OAuth on the prod domains.
5. Live activity / presence avatars work -> Socket.IO upgrade through Nginx OK.
6. `pm2 list` -> `zeltxx-backend` online; `pm2 logs` has no crash loop.
7. Failure drill: `pm2 stop zeltxx-backend`, then `git push` a trivial commit and
   confirm the pipeline FAILS at the health gate (proves the guard works), then
   `pm2 start` and redeploy.