#!/bin/bash

# Configuration
S3_BUCKET="s3://forexai-pro-backups"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
BACKUP_DIR="/tmp/forexai_backups"
DB_CONTAINER="forexai_db"
DB_USER="forexai"
DB_NAME="forexai_pro"

mkdir -p $BACKUP_DIR
cd $BACKUP_DIR

echo "📦 Extracting logical pg_dump from PostgreSQL container..."
docker exec -t $DB_CONTAINER pg_dumpall -c -U $DB_USER > dump_$TIMESTAMP.sql

echo "🗜️ Compressing payload inherently mapping bandwidth limits..."
tar -czvf forexai_backup_$TIMESTAMP.tar.gz dump_$TIMESTAMP.sql

echo "☁️ Pushing mapped partition to remote AWS S3 encrypted bounds..."
# Requires aws-cli configured natively on the Host VM!
aws s3 cp forexai_backup_$TIMESTAMP.tar.gz $S3_BUCKET/

echo "🧹 Cleaning up volatile tmp maps..."
rm dump_$TIMESTAMP.sql forexai_backup_$TIMESTAMP.tar.gz

echo "✅ Remote Database Backup extraction fully successful: $TIMESTAMP"
