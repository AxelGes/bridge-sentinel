#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

AXL_PORTS="9001 9002 9011 9012 9021 9022 7001 7002 7003"

# ── Kill anything on our ports ───────────────────────────────────────
echo "Clearing ports..."
for port in $AXL_PORTS; do
  lsof -ti :"$port" 2>/dev/null | xargs kill 2>/dev/null || true
done

# Wait until all ports are actually free
for i in $(seq 1 20); do
  busy=""
  for port in $AXL_PORTS; do
    lsof -ti :"$port" &>/dev/null && busy="$port"
  done
  [ -z "$busy" ] && break
  [ "$i" = "20" ] && { echo "Port $busy still in use after 10s — aborting"; exit 1; }
  sleep 0.5
done

# ── Generate ed25519 keypairs if missing ──────────────────────────────
for agent in config anomaly risk; do
  pem="private-${agent}.pem"
  if [ ! -f "$pem" ]; then
    echo "Generating keypair: $pem"
    openssl genpkey -algorithm ed25519 -out "$pem"
  fi
done

# ── Check for AXL binary ─────────────────────────────────────────────
if [ ! -x ./node ]; then
  echo ""
  echo "AXL binary not found at ./node"
  echo ""
  echo "To build it:"
  echo "  git clone https://github.com/gensyn-ai/axl.git /tmp/axl-build"
  echo "  cd /tmp/axl-build && make build"
  echo "  cp /tmp/axl-build/node $(pwd)/node"
  echo ""
  echo "Requires Go 1.25.5+ (current: $(go version 2>/dev/null || echo 'not installed'))"
  exit 1
fi

# ── Trap Ctrl-C to kill all sidecars ─────────────────────────────────
cleanup() {
  echo ""
  echo "Stopping sidecars..."
  kill $PID_CONFIG $PID_ANOMALY $PID_RISK 2>/dev/null
  wait 2>/dev/null
}
trap cleanup INT TERM EXIT

# ── Launch 3 sidecars ────────────────────────────────────────────────
echo "Starting AXL sidecars..."

./node -config config-node.json  &
PID_CONFIG=$!
echo "  Config  sidecar PID=$PID_CONFIG (API :9002, TLS :9001)"

./node -config anomaly-node.json &
PID_ANOMALY=$!
echo "  Anomaly sidecar PID=$PID_ANOMALY (API :9012, TLS :9011)"

./node -config risk-node.json    &
PID_RISK=$!
echo "  Risk    sidecar PID=$PID_RISK (API :9022, TLS :9021)"

echo ""
echo "Waiting for sidecars to start..."
sleep 3

echo ""
echo "── Agent public keys (paste into .env or ENS) ──"
for port in 9002 9012 9022; do
  name="config"
  [ "$port" = "9012" ] && name="anomaly"
  [ "$port" = "9022" ] && name="risk"
  pubkey=$(curl -s "http://127.0.0.1:${port}/topology" | grep -o '"our_public_key":"[^"]*"' | cut -d'"' -f4 2>/dev/null || echo "unavailable")
  printf "  %-8s (:%d): %s\n" "$name" "$port" "$pubkey"
done

echo ""
echo "All sidecars running. Press Ctrl-C to stop."
echo ""

wait
