# Command Cheatsheet — Quick lookup

## Test toàn bộ
```bash
bash .claude/skills/test_skills.sh
```

## Skill 1 — `internal-link-skill`
```bash
cd .claude/skills/internal-link-skill

# Extract keywords
python scripts/extract_keywords.py source.txt --top 20

# Relevance score
python scripts/relevance_score.py source.txt pages.json --min-score 60

# Claude API suggest anchors
ANTHROPIC_API_KEY=sk-ant-... python scripts/api_integration.py suggest-anchors \
    --target-url URL --keyword KW -n 5

# GSC keywords
GSC_CREDENTIALS_JSON=/path/sa.json python scripts/api_integration.py gsc-keywords \
    --site sc-domain:example.com --page URL
```

## Skill 2 — `semantic-internal-linker`
```bash
cd .claude/skills/semantic-internal-linker

# Parse CSV thô từ Google Sheet
python scripts/prepare_input.py --raw raw.csv \
    --urls-out inputs/urls.csv --anchors-out inputs/anchors.csv

# Run full pipeline (5 bước)
python scripts/run_pipeline.py \
    --urls inputs/urls.csv --anchors inputs/anchors.csv --out outputs/

# Sinh report MD
python scripts/generate_report.py --links outputs/internal_links.json --out outputs/report.md

# Chạy từng bước
python scripts/step1_semantic_clustering.py --urls inputs/urls.csv --out outputs/clusters.json
python scripts/step2_semantic_graph.py --clusters outputs/clusters.json --out outputs/graph.json
python scripts/step3_link_allocation.py --graph outputs/graph.json --out outputs/link_pairs.json
python scripts/step4_anchor_distribution.py --pairs outputs/link_pairs.json --anchors inputs/anchors.csv --out outputs/link_pairs_with_anchor.json
python scripts/step5_link_placement.py --pairs outputs/link_pairs_with_anchor.json --urls inputs/urls.csv \
    --out-json outputs/internal_links.json --out-xlsx outputs/internal_links.xlsx
```

## Skill 3 — `inlink-stats`
```bash
cd .claude/skills/inlink-stats

# Phân tích cơ bản
python scripts/analyze.py --input <links.json|.csv> --out outputs/

# Phân tích đầy đủ (JSON + MD + XLSX + HTML)
python scripts/analyze.py --input <links> --out outputs/ --format all

# So sánh 2 build
python scripts/compare.py --before old/stats.json --after new/stats.json --out diff.md

# Export Excel riêng
python scripts/export_excel.py --stats outputs/stats.json --out outputs/report.xlsx

# Generate HTML report riêng
python scripts/generate_html.py --stats outputs/stats.json --out outputs/report.html
```

## Workflow end-to-end (1-liner)
```bash
# Từ root repo
cd .claude/skills/semantic-internal-linker && \
python scripts/run_pipeline.py --urls inputs/urls.csv --anchors inputs/anchors.csv --out outputs/ && \
cd ../inlink-stats && \
python scripts/analyze.py --input ../semantic-internal-linker/outputs/internal_links.json --out outputs/ --format all && \
open outputs/report.html
```

## Cài đặt nhanh
```bash
pip install pandas numpy scikit-learn networkx openpyxl sentence-transformers
```

## Deploy demo lên Pages (sau khi update data)
```bash
cp .claude/skills/semantic-internal-linker/outputs/internal_links.json web-app/frontend/public/skill-demo/links.json
cp .claude/skills/semantic-internal-linker/outputs/clusters.json web-app/frontend/public/skill-demo/clusters.json
cp .claude/skills/inlink-stats/outputs/stats.json web-app/frontend/public/skill-demo/stats.json
git add -A && git commit -m "Update demo data" && git push origin main
```

## Common flags

| Flag | Skill | Tác dụng |
|------|-------|----------|
| `--top N` | skill 1 extract | Lấy N keyword đầu |
| `--min-score N` | skill 1 relevance | Lọc score ≥ N (0-100) |
| `--k N` | skill 2 step1 | Số cluster (0 = auto) |
| `--top N` | skill 2 step2 | Số neighbor / node |
| `--k-out N` | skill 2 step3 | Số outbound / URL |
| `--k-in N` | skill 2 step3 | Số inbound / URL |
| `--format json/md/all` | skill 3 analyze | Loại output |
