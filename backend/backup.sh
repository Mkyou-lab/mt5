#!/bin/bash

# Get MongoDB URL from Railway
MONGO_URL=$MONGODB_URI

# Create backup directory
BACKUP_DIR="./backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p $BACKUP_DIR

# Backup database
mongodump --uri="$MONGO_URL" --out=$BACKUP_DIR

# Upload to cloud storage (optional)
# aws s3 cp $BACKUP_DIR s3://mkpro-backups/ --recursive

echo "Backup completed: $BACKUP_DIR"
