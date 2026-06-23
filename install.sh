#!/usr/bin/env bash
# Strength Deck Design System Harness installer
# Cross-platform: bash (Git Bash / macOS / Linux)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

echo "==> Strength Deck Design System Harness"
echo "    Root: $ROOT"

if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: Node.js is required (>= 20). Install it from https://nodejs.org/"
  exit 1
fi

NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]")"
if [ "$NODE_MAJOR" -lt 20 ]; then
  echo "WARNING: Node $NODE_MAJOR detected. Node 20+ is recommended."
fi

if [ -f package.json ]; then
  echo "==> Installing npm dependencies..."
  npm install
else
  echo "WARNING: package.json not found. Skipping npm install."
fi

mkdir -p src/components src/styles .codex/hooks .codex/agents .cursor docs

for hook in .codex/hooks/*.mjs; do
  if [ -f "$hook" ]; then
    chmod +x "$hook" 2>/dev/null || true
  fi
done

if [ -f .codex/settings.json ] && [ -f .cursor/hooks.json ]; then
  echo "==> Cursor hooks are available at .cursor/hooks.json"
  echo "    Restart Cursor to load project hooks."
fi

for file in src/styles/tokens.css src/styles/theme.css; do
  if [ ! -f "$file" ]; then
    echo "WARNING: Missing $file"
  fi
done

echo "==> Running hook smoke tests..."
node .codex/hooks/check-design-tokens.mjs --ci src/components 2>/dev/null || true
node .codex/hooks/check-story-exists.mjs --ci src/components 2>/dev/null || true

echo ""
echo "Harness installed."
echo ""
echo "Next steps:"
echo "  1. Read CODEX.md and .codex/CODEX.md"
echo "  2. npm run dev"
echo "  3. npm run check:tokens"
echo "  4. Configure Vercel POSTGRES_* env vars before deploying login sync"
