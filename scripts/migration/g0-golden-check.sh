#!/usr/bin/env bash
# ── G0 골든 재현 게이트 (C7) ─────────────────────────────────────────────────
# 전 그룹을 build-group 으로 재생성 → `git diff src/data/group-*.json` = 0 이어야
# 커밋된 골든이 현재 DB+build-group 으로 완전 재현됨을 의미.
# 파괴적 단계(컬럼 드롭·build-group 재배선) 전후로 돌려 도감 회귀 0 을 증명한다.
#   사용: bash scripts/migration/g0-golden-check.sh [groupId ...]   (인자 없으면 전 그룹)
set -uo pipefail
cd "$(git rev-parse --show-toplevel)" || { echo "git repo root 못 찾음"; exit 1; }

if [ "$#" -gt 0 ]; then GROUPS=("$@"); else
  GROUPS=()
  for f in src/data/group-*.json; do GROUPS+=("$(basename "$f" .json | sed 's/^group-//')"); done
fi

echo "G0 재현 검사: ${#GROUPS[@]} 그룹 재생성…"
fail=0; i=0
for g in "${GROUPS[@]}"; do
  i=$((i+1))
  if ! npx tsx scripts/build-group.ts "$g" >/dev/null 2>&1; then echo "  ⛔ FAIL: $g"; fail=$((fail+1)); fi
  [ $((i % 25)) -eq 0 ] && echo "  …$i/${#GROUPS[@]}"
done

echo ""
echo "=== 재생성 후 변경된 JSON (0이어야 골든 재현됨) ==="
changed=$(git diff --name-only src/data/group-*.json | wc -l)
git diff --stat src/data/group-*.json | tail -20
echo ""
echo "── 결과: 변경 ${changed}개 · 빌드실패 ${fail}개 ──"
[ "$changed" -eq 0 ] && [ "$fail" -eq 0 ] && echo "✅ 골든 완전 재현 (diff=0)" || echo "🔴 불일치 — 골든/DB 정합 필요"
