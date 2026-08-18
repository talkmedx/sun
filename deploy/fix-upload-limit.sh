#!/usr/bin/env bash
set -euo pipefail

# Raise Nginx upload limit so admission photo/PDF posts are not rejected with 413.
CONF_DIR=/etc/nginx/conf.d
TARGET="$CONF_DIR/client_max_body_size.conf"

if [[ ! -d "$CONF_DIR" ]]; then
  echo "Nginx conf.d not found at $CONF_DIR"
  exit 1
fi

echo 'client_max_body_size 50M;' | sudo tee "$TARGET" >/dev/null

# Override any smaller per-site limits.
if command -v grep >/dev/null; then
  while IFS= read -r file; do
    sudo sed -i 's/client_max_body_size[^;]*;/client_max_body_size 50M;/g' "$file"
  done < <(sudo grep -rl 'client_max_body_size' /etc/nginx --include='*.conf' || true)
fi

sudo nginx -t
sudo systemctl reload nginx
echo "Nginx upload limit set to 50M"
