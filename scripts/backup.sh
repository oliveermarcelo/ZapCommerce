#!/bin/bash
BACKUP_DIR="/opt/wapify/backups"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
echo "💾 Backup: $DATE"
docker exec wapify-db pg_dump -U wapify wapify | gzip > "$BACKUP_DIR/wapify_$DATE.sql.gz"
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete
echo "✅ $BACKUP_DIR/wapify_$DATE.sql.gz ($(du -h $BACKUP_DIR/wapify_$DATE.sql.gz | cut -f1))"
