#!/usr/bin/env bash
set -euo pipefail
cd /home/team/shared/site
sudo sh -c 'lsof -t -iTCP:3000 -sTCP:LISTEN | xargs -r kill' 2>/dev/null || true
sleep 1
bun install
bun run build
setsid nohup bun run start > .run/server.log 2>&1 < /dev/null &
sleep 3
# Verify
echo "BUILD_DONE"
for path in "/" "/onboarding" "/sales-call" "/pipeline" "/portal" "/admin"; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000${path}")
  echo "HTTP ${code} ${path}"
done
