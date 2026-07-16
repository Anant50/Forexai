#!/bin/bash
set -e

echo "🚀 Initiating ForexAI Pro Production Deployment"

# Pull latest configurations if triggered from CI/CD
# git pull origin main

echo "🛑 Stopping active containers safely..."
docker-compose -f docker-compose.prod.yml down

echo "🏗️ Rebuilding optimized UI and Backend Docker images..."
docker-compose -f docker-compose.prod.yml build --no-cache

echo "⚡ Booting Infrastructure Maps..."
docker-compose -f docker-compose.prod.yml up -d

echo "✅ Deployment Successful! Verifying Nginx routing..."
docker ps | grep forexai_proxy

echo "Live System is now listening on Port 80 and 443! Wait 10 seconds before hitting the API bounds."
