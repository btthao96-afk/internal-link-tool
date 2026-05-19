#!/usr/bin/env bash
# Smoke test cho toàn bộ skill trong .claude/skills/
# Chạy: bash test_skills.sh

set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
REPORT="$HERE/test-report.md"
PASS=0
FAIL=0
RESULTS=()

color_green() { printf "\033[32m%s\033[0m" "$1"; }
color_red()   { printf "\033[31m%s\033[0m" "$1"; }

record() {
  local name="$1" status="$2" detail="$3"
  if [[ "$status" == "PASS" ]]; then
    PASS=$((PASS+1))
    echo "$(color_green "✔") $name — $detail"
  else
    FAIL=$((FAIL+1))
    echo "$(color_red "✘") $name — $detail"
  fi
  RESULTS+=("| $status | $name | $detail |")
}

check_skill_md() {
  local skill_dir="$1"
  local md="$skill_dir/SKILL.md"
  local name="$(basename "$skill_dir")::SKILL.md"
  if [[ ! -f "$md" ]]; then
    record "$name" FAIL "missing SKILL.md"; return
  fi
  if ! head -1 "$md" | grep -q '^---$'; then
    record "$name" FAIL "missing frontmatter delimiter"; return
  fi
  if ! grep -q '^name:' "$md" || ! grep -q '^description:' "$md"; then
    record "$name" FAIL "missing name/description in frontmatter"; return
  fi
  record "$name" PASS "frontmatter OK"
}

# ============ Test 1: internal-link-skill ============
echo ""
echo "=== Testing internal-link-skill ==="
SK1="$HERE/internal-link-skill"
check_skill_md "$SK1"

TMP1="$(mktemp -d)"
cat > "$TMP1/source.txt" <<EOF
Internal link là yếu tố quan trọng trong SEO on-page. Việc tối ưu liên kết nội bộ giúp Google hiểu cấu trúc website và phân bổ link equity.
Anchor text cần đa dạng và tự nhiên. Tránh dùng cùng một anchor text cho nhiều link khác nhau vì sẽ bị Google đánh giá over-optimization.
EOF

cat > "$TMP1/pages.json" <<EOF
[
  {"url": "https://x.com/internal-link", "title": "Internal link là gì", "content": "Internal link giúp Google hiểu cấu trúc và phân bổ link equity hiệu quả cho website."},
  {"url": "https://x.com/anchor-text", "title": "Anchor text đa dạng", "content": "Anchor text đa dạng giúp tránh over-optimization và tăng thứ hạng SEO tự nhiên."},
  {"url": "https://x.com/random", "title": "Bài viết không liên quan", "content": "Đây là một bài viết về nấu ăn món phở bò truyền thống Việt Nam."}
]
EOF

if python3 "$SK1/scripts/extract_keywords.py" "$TMP1/source.txt" --top 5 > "$TMP1/kw.json" 2>&1; then
  if python3 -c "import json; d=json.load(open('$TMP1/kw.json')); assert len(d['keywords'])>0; print('keywords ok')" >/dev/null 2>&1; then
    record "internal-link-skill::extract_keywords" PASS "trích xuất $(python3 -c "import json; print(len(json.load(open('$TMP1/kw.json'))['keywords']))" 2>/dev/null) keyword"
  else
    record "internal-link-skill::extract_keywords" FAIL "output JSON invalid"
  fi
else
  record "internal-link-skill::extract_keywords" FAIL "script crashed"
fi

if python3 "$SK1/scripts/relevance_score.py" "$TMP1/source.txt" "$TMP1/pages.json" --min-score 0 > "$TMP1/rel.json" 2>&1; then
  N=$(python3 -c "import json; print(len(json.load(open('$TMP1/rel.json'))))" 2>/dev/null || echo 0)
  TOP=$(python3 -c "import json; d=json.load(open('$TMP1/rel.json')); print(d[0]['url'] if d else '')" 2>/dev/null)
  if [[ "$N" -ge 1 ]] && [[ "$TOP" == *"internal-link"* || "$TOP" == *"anchor"* ]]; then
    record "internal-link-skill::relevance_score" PASS "top match = $TOP (n=$N)"
  else
    record "internal-link-skill::relevance_score" FAIL "top result unexpected: $TOP"
  fi
else
  record "internal-link-skill::relevance_score" FAIL "script crashed"
fi

# ============ Test 2: semantic-internal-linker ============
echo ""
echo "=== Testing semantic-internal-linker ==="
SK2="$HERE/semantic-internal-linker"
check_skill_md "$SK2"

TMP2="$(mktemp -d)"
cp "$SK2/templates/urls.csv"    "$TMP2/urls.csv"
cp "$SK2/templates/anchors.csv" "$TMP2/anchors.csv"

if python3 "$SK2/scripts/run_pipeline.py" \
    --urls "$TMP2/urls.csv" \
    --anchors "$TMP2/anchors.csv" \
    --out "$TMP2/out" >"$TMP2/pipeline.log" 2>&1; then
  if [[ -f "$TMP2/out/internal_links.json" && -f "$TMP2/out/internal_links.xlsx" ]]; then
    N=$(python3 -c "import json; print(len(json.load(open('$TMP2/out/internal_links.json'))))")
    record "semantic-internal-linker::pipeline (templates)" PASS "$N links sinh ra"
  else
    record "semantic-internal-linker::pipeline (templates)" FAIL "thiếu file output"
  fi
else
  record "semantic-internal-linker::pipeline (templates)" FAIL "pipeline crashed (xem $TMP2/pipeline.log)"
fi

if [[ -f "$SK2/outputs/internal_links.json" ]]; then
  REAL_N=$(python3 -c "import json; print(len(json.load(open('$SK2/outputs/internal_links.json'))))")
  CLUSTERS=$(python3 -c "import json; d=json.load(open('$SK2/outputs/clusters.json')); print(d['k'])")
  record "semantic-internal-linker::real data run" PASS "$REAL_N links từ $CLUSTERS cluster (138 URLs noithattheone)"
else
  record "semantic-internal-linker::real data run" FAIL "chưa có outputs/internal_links.json"
fi

if python3 -c "
import json, sys
d = json.load(open('$SK2/outputs/internal_links.json'))
assert isinstance(d, list) and len(d) > 0
required = {'source','target','anchor','anchor_type','position','semantic_score'}
missing = required - set(d[0].keys())
sys.exit(0 if not missing else 1)
" 2>/dev/null; then
  record "semantic-internal-linker::output schema" PASS "đủ các field source/target/anchor/anchor_type/position/score"
else
  record "semantic-internal-linker::output schema" FAIL "thiếu field"
fi

if python3 -c "
import json
d = json.load(open('$SK2/outputs/internal_links.json'))
self_links = [x for x in d if x['source'] == x['target']]
assert len(self_links) == 0, f'self-link={len(self_links)}'
seen = set()
dup = 0
for x in d:
    k = (x['source'], x['target'])
    if k in seen: dup += 1
    seen.add(k)
assert dup == 0, f'dup={dup}'
" 2>/dev/null; then
  record "semantic-internal-linker::rules (no self-link, no dup)" PASS "tuân thủ rule"
else
  record "semantic-internal-linker::rules (no self-link, no dup)" FAIL "vi phạm rule"
fi

# ============ Test 3: inlink-stats ============
echo ""
echo "=== Testing inlink-stats ==="
SK3="$HERE/inlink-stats"
check_skill_md "$SK3"

TMP3="$(mktemp -d)"
cat > "$TMP3/links.json" <<EOF
[
  {"source":"/a","target":"/b","anchor":"camera","anchor_type":"exact","cluster":"x","same_cluster":true},
  {"source":"/a","target":"/c","anchor":"camera","anchor_type":"exact","cluster":"x","same_cluster":true},
  {"source":"/b","target":"/c","anchor":"xem thêm","anchor_type":"generic","cluster":"x","same_cluster":true},
  {"source":"/c","target":"/a","anchor":"chi tiết","anchor_type":"generic","cluster":"x","same_cluster":true},
  {"source":"/d","target":"/a","anchor":"đánh giá camera","anchor_type":"partial","cluster":"x","same_cluster":true}
]
EOF

if python3 "$SK3/scripts/analyze.py" --input "$TMP3/links.json" --out "$TMP3/out" --format all >"$TMP3/log" 2>&1; then
  if [[ -f "$TMP3/out/stats.json" && -f "$TMP3/out/report.md" && -f "$TMP3/out/report.xlsx" && -f "$TMP3/out/report.html" ]]; then
    record "inlink-stats::analyze (all formats)" PASS "stats.json + report.md + .xlsx + .html"
  else
    record "inlink-stats::analyze (all formats)" FAIL "thiếu output file"
  fi
else
  record "inlink-stats::analyze (all formats)" FAIL "crashed (xem $TMP3/log)"
fi

if python3 -c "
import json
s = json.load(open('$TMP3/out/stats.json'))
o = s['overview']
assert o['total_links'] == 5
assert o['unique_urls'] == 4
ap = s['anti_patterns']
assert len(ap['confused_anchors']) >= 1, 'phải detect được anchor camera→2 targets'
assert ap['generic_anchor_pct'] > 0
" 2>/dev/null; then
  record "inlink-stats::detect anti-patterns" PASS "phát hiện confused anchors + generic anchor"
else
  record "inlink-stats::detect anti-patterns" FAIL "anti-pattern detection sai"
fi

if [[ -f "$SK3/outputs/stats.json" ]]; then
  REAL_LINKS=$(python3 -c "import json; print(json.load(open('$SK3/outputs/stats.json'))['overview']['total_links'])")
  REAL_ORPH=$(python3 -c "import json; print(len(json.load(open('$SK3/outputs/stats.json'))['orphans']))")
  record "inlink-stats::real data" PASS "$REAL_LINKS links analyzed, $REAL_ORPH orphans"
else
  record "inlink-stats::real data" FAIL "chưa có outputs/stats.json"
fi

# ============ Write report ============
{
  echo "# Skill Test Report"
  echo ""
  echo "**Date:** $(date '+%Y-%m-%d %H:%M:%S')"
  echo "**Passed:** $PASS"
  echo "**Failed:** $FAIL"
  echo ""
  echo "## Results"
  echo ""
  echo "| Status | Test | Detail |"
  echo "|--------|------|--------|"
  printf '%s\n' "${RESULTS[@]}"
} > "$REPORT"

echo ""
echo "============================================"
echo "Passed: $PASS | Failed: $FAIL"
echo "Report: $REPORT"
[[ "$FAIL" -eq 0 ]] && exit 0 || exit 1
