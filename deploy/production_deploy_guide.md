# ForexAI Pro — Production Deployment Guide

This guide is for System Administrators bringing ForexAI Pro online using a VM (AWS EC2, DigitalOcean Droplet, GCP Compute Engine).

### Prerequisites
- A Linux VM (Debian/Ubuntu 22.04 recommended) with at least **8GB RAM** and **4 vCPUs**.
- Root or `sudo` shell access.
- A registered domain (e.g., `api.forexai.pro`) pointed to the VM's static IP.
- GitHub Secrets correctly configured (see GitHub Actions section).

---

## 1. Initial Server Setup
Connect to your VM via SSH:
```bash
ssh root@your_server_ip
```
Install Docker and Docker-Compose natively:
```bash
sudo apt update
sudo apt install -y docker.io docker-compose
sudo systemctl enable --now docker
```

---

## 2. GitHub Actions (Continuous Deployment)
To let GitHub automatically deploy your code when pushed to `main`, set the following exact Secrets in your GitHub Repository under `Settings > Secrets and Variables > Actions`:

- `PROD_HOST`: Your VM's IP address.
- `PROD_USER`: Your SSH username (e.g., `root`, `ubuntu`, `admin`).
- `PROD_SSH_KEY`: The private Ed25519 or RSA SSH key that can login to your `PROD_USER`.
- `SECRET_KEY`: A loud random string (e.g., `openssl rand -hex 32`) for JWT Tokens (Phase 1).
- `POSTGRES_USER`: Secure DB username (e.g., `forexadmin`).
- `POSTGRES_PASSWORD`: Secure DB password.
- `POSTGRES_DB`: Secure DB name.
- `REDIS_PASSWORD`: Secure Redis password.

Once saved, simply pushing to `main` will automatically build the backend, align the database, and spin up the Nginx proxy seamlessly!

---

## 3. SSL Configuration (Certbot & Nginx)
By default, the deployed Nginx reverses traffic on port `80` (HTTP). To enable HTTPS/WSS:

1. SSH into the box.
2. Certbot install:
   ```bash
   sudo apt install -y certbot
   ```
3. Generate the SSL certificate (Replace `api.yourdomain.com`):
   ```bash
   sudo certbot certonly --webroot -w ./deploy/certbot_www -d api.yourdomain.com
   ```
4. Link the certificates into docker space.
5. In `./deploy/nginx.conf`, **uncomment** the HTTPS block at the bottom, change `yourdomain.com` to your real domain, and uncomment the `return 301 https://$host$request_uri;` rule.
6. Reload docker:
   ```bash
   cd ~/forexai-pro/deploy
   docker-compose -f docker-compose.prod.yml restart nginx
   ```

---

## 4. Maintenance Operations

### Checking Backend Logs (FastAPI/Gunicorn worker status)
```bash
docker logs -f forexai_backend
```

### Backups 
To take a complete dump of your users, analysis, and ML models logic:
```bash
docker exec -t forexai_db pg_dump -U forexai_admin -d forexai_prod > backend_backup_$(date +%Y%m%d).sql
```
This `.sql` file can be downloaded off-site into AWS S3 automatically using a cron job.

### Flushing Memory / Resetting AI States
Machine learning memory bounds can occasionally fill RAM. If Gunicorn memory climbs above 6GB:
```bash
docker restart forexai_backend
```
*Note: Due to the XAI separation matrices and SQLite lazy loading implementations we injected, this should rarely be necessary.*
