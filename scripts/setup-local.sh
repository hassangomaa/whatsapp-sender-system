#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> WhatsApp Sender — local setup"

if ! command -v psql &>/dev/null; then
  echo "Installing PostgreSQL via Homebrew..."
  brew install postgresql@16
  export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"
fi

if ! command -v redis-server &>/dev/null; then
  echo "Installing Redis via Homebrew..."
  brew install redis
fi

brew services start postgresql@16 2>/dev/null || true
brew services start redis 2>/dev/null || true
sleep 2

export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"

createdb whatsapp_sender 2>/dev/null || true
psql -d postgres -c "CREATE USER whatsapp WITH PASSWORD 'whatsapp';" 2>/dev/null || true
psql -d postgres -c "GRANT ALL PRIVILEGES ON DATABASE whatsapp_sender TO whatsapp;" 2>/dev/null || true
psql -d postgres -c "ALTER DATABASE whatsapp_sender OWNER TO whatsapp;" 2>/dev/null || true

if [ ! -f .env ]; then
  cp .env.example .env
  # Homebrew defaults (not Docker ports)
  sed -i '' 's|localhost:5433|localhost:5432|g' .env 2>/dev/null || sed -i 's|localhost:5433|localhost:5432|g' .env
  sed -i '' 's|localhost:6380|localhost:6379|g' .env 2>/dev/null || sed -i 's|localhost:6380|localhost:6379|g' .env
  if ! grep -q '^BAILEYS_MOCK=' .env; then
    echo "BAILEYS_MOCK=0" >> .env
  fi
fi

export $(grep -v '^#' .env | xargs)

npm install
npm run db:push
npm run db:generate
npm run seed -w @whatsapp-sender/database

echo ""
echo "✅ Setup complete!"
echo ""
echo "   Production (real WhatsApp):"
echo "     npm run build && npm run start"
echo "     ↑ keep this terminal open while using the app"
echo ""
echo "   Development (hot reload):"
echo "     npm run dev"
echo ""
echo "   Dashboard:  http://localhost:3011"
echo "   API health: http://localhost:3010/health"
echo "   Test all:   npm run smoke:all   (in another terminal)"
