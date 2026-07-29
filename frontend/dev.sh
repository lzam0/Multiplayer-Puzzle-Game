#!/bin/bash
IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null)

if [ -z "$IP" ]; then
  echo "Could not detect LAN IP — falling back to localhost"
  IP="localhost"
fi

cat > .env.local <<EOF
BACKEND_URL=http://localhost:8888
NEXT_PUBLIC_WS_URL=http://$IP:8888
NEXT_PUBLIC_HOST_ORIGIN=http://$IP:3333
EOF

echo "LAN IP: $IP"
npx next dev -p 3333
