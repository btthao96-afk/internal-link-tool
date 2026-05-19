#!/usr/bin/env bash
# Đẩy branch refactor/skills-folder lên main rồi cleanup.
# Chạy: bash sync-to-main.sh
set -euo pipefail

cd "$(dirname "$0")"

echo "→ Fetch latest..."
git fetch origin

echo "→ Push refactor/skills-folder thẳng lên main..."
git push origin refactor/skills-folder:main

echo "→ Cập nhật local main cho khớp remote..."
git checkout main
git pull --ff-only origin main

echo ""
echo "✅ Xong! Mở: https://github.com/btthao96-afk/internal-link-tool"
echo "   Bạn sẽ thấy folder skills/ + .claude/skills/ đầy đủ trên main."
