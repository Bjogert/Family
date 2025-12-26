#!/bin/bash
# ===========================================
# Family Hub - Database Backup Script
# ===========================================
# Usage: ./backup.sh [backup|restore|list]
#
# Backups are stored in /home/robert/backups/
# Keeps last 7 daily backups automatically

BACKUP_DIR="/home/robert/backups"
DB_NAME="family_hub"
DB_USER="family_hub"
DATE=$(date +%Y-%m-%d_%H-%M-%S)
KEEP_DAYS=7

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

case "$1" in
  backup)
    echo "Creating backup..."
    BACKUP_FILE="$BACKUP_DIR/family_hub_$DATE.sql.gz"
    
    # Create compressed backup
    sudo -u postgres pg_dump "$DB_NAME" | gzip > "$BACKUP_FILE"
    
    if [ $? -eq 0 ]; then
      echo "✓ Backup created: $BACKUP_FILE"
      echo "  Size: $(du -h "$BACKUP_FILE" | cut -f1)"
      
      # Remove backups older than KEEP_DAYS
      find "$BACKUP_DIR" -name "family_hub_*.sql.gz" -mtime +$KEEP_DAYS -delete
      echo "✓ Old backups cleaned up (keeping last $KEEP_DAYS days)"
    else
      echo "✗ Backup failed!"
      exit 1
    fi
    ;;
    
  restore)
    if [ -z "$2" ]; then
      echo "Usage: ./backup.sh restore <backup_file>"
      echo ""
      echo "Available backups:"
      ls -lh "$BACKUP_DIR"/*.sql.gz 2>/dev/null || echo "  No backups found"
      exit 1
    fi
    
    RESTORE_FILE="$2"
    if [ ! -f "$RESTORE_FILE" ]; then
      # Try with backup dir prefix
      RESTORE_FILE="$BACKUP_DIR/$2"
    fi
    
    if [ ! -f "$RESTORE_FILE" ]; then
      echo "✗ Backup file not found: $2"
      exit 1
    fi
    
    echo "⚠️  WARNING: This will REPLACE all current data!"
    echo "    Restoring from: $RESTORE_FILE"
    read -p "Are you sure? (yes/no): " confirm
    
    if [ "$confirm" != "yes" ]; then
      echo "Restore cancelled."
      exit 0
    fi
    
    echo "Stopping services..."
    sudo systemctl stop family-hub-api family-hub-web
    
    echo "Restoring database..."
    gunzip -c "$RESTORE_FILE" | sudo -u postgres psql "$DB_NAME"
    
    if [ $? -eq 0 ]; then
      echo "✓ Database restored successfully"
    else
      echo "✗ Restore failed!"
    fi
    
    echo "Starting services..."
    sudo systemctl start family-hub-api family-hub-web
    echo "✓ Services restarted"
    ;;
    
  list)
    echo "Available backups in $BACKUP_DIR:"
    echo ""
    ls -lh "$BACKUP_DIR"/*.sql.gz 2>/dev/null || echo "  No backups found"
    ;;
    
  *)
    echo "Family Hub Database Backup"
    echo "=========================="
    echo ""
    echo "Usage:"
    echo "  ./backup.sh backup          - Create a new backup"
    echo "  ./backup.sh restore <file>  - Restore from a backup"
    echo "  ./backup.sh list            - List available backups"
    echo ""
    echo "Backups are stored in: $BACKUP_DIR"
    echo "Automatic cleanup: keeps last $KEEP_DAYS days"
    ;;
esac
