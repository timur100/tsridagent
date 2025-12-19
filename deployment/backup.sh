#!/bin/bash

# TSRID MongoDB Backup Script

set -e

BACKUP_DIR="/opt/tsrid-app/mongo-backup"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="backup_${DATE}.gz"
LOG_FILE="/var/log/tsrid-backup.log"

echo "[$(date)] 📦 Starting MongoDB backup..." | tee -a "$LOG_FILE"

# Create backup directory if not exists
mkdir -p "$BACKUP_DIR"

# Create backup
if docker exec tsrid-mongo mongodump --archive=/backup/${BACKUP_FILE} --gzip; then
    echo "[$(date)] ✅ Backup created: ${BACKUP_FILE}" | tee -a "$LOG_FILE"
    
    # Get backup size
    SIZE=$(du -h "${BACKUP_DIR}/${BACKUP_FILE}" | cut -f1)
    echo "[$(date)] 📊 Backup size: ${SIZE}" | tee -a "$LOG_FILE"
    
    # Keep only last 7 days
    find "${BACKUP_DIR}" -name "backup_*.gz" -mtime +7 -delete
    echo "[$(date)] 🧹 Old backups cleaned" | tee -a "$LOG_FILE"
else
    echo "[$(date)] ❌ Backup failed!" | tee -a "$LOG_FILE"
    exit 1
fi

echo "[$(date)] ✅ Backup complete" | tee -a "$LOG_FILE"
