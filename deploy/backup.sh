#!/usr/bin/env bash
set -euo pipefail
STAMP=$(date +%Y%m%d-%H%M%S)
DEST="${BACKUP_DIR:-/var/backups/dar-alunotha}"
mkdir -p "$DEST"
if [ -n "${SQLITE_PATH:-}" ] && [ -f "$SQLITE_PATH" ]; then
  cp "$SQLITE_PATH" "$DEST/app-$STAMP.db"
fi
if [ -d "${UPLOADS_PATH:-}" ]; then
  tar -czf "$DEST/uploads-$STAMP.tar.gz" -C "$(dirname "$UPLOADS_PATH")" "$(basename "$UPLOADS_PATH")"
fi
find "$DEST" -type f -mtime +14 -delete
echo "Backup saved in $DEST"
