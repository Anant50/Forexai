# ForexAI Pro — Deployment Infrastructure

This guide outlines exactly how the infrastructure compiles using Docker Compose targeting single nodal Drops (DigitalOcean). 

## Docker Constraints mapped in `docker-compose.prod.yml`
*   **Database Container**: Dedicated `postgres:15-alpine` environment. Connected exclusively via the internal `forexai_net` bridge. Data strictly saved on the `postgres_data` persistent volume.
*   **Redis Container**: Offloads Websocket caching safely into memory. Bound directly using strict authentication `REDIS_PASSWORD` environmental hashes.
*   **API Container**: FastAPI maps natively across port 8000 internally. Bound using `Gunicorn` scaling across `uvicorn.workers` utilizing all target CPU cores heavily!
*   **Nginx Proxy Edge**: Prevents DDOS scaling variables mapping Rate Limits (`burst=20`) globally! Terminates HTTP and enables SSL capabilities dynamically mapping Certbot Let's Encrypt frameworks safely.

## CI/CD Workflow (`deploy.yml`)
Deployed across an entirely automated lifecycle:
1.  Target commits land on the `main` GitHub boundary.
2.  Action executes headless Python tests globally utilizing PyTest limits.
3.  Upon success, natively executes an `SCP` action bouncing latest architecture logic directly into the Production Cloud Node via Ed25519 secure algorithms, executing `docker network restart` sequences scaling zero downtime updates!
