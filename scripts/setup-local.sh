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
  echo "BAILEYS_MOCK=1" >> .env
fi

export $(grep -v '^#' .env | xargs)

npm install
npm run db:push
npm run db:generate
npm run seed -w @whatsapp-sender/database

echo ""
echo "✅ Setup complete!"
echo "   Run: BAILEYS_MOCK=1 npm run dev"
echo "   Dashboard: http://localhost:3011"
echo "   API:       http://localhost:3010"
