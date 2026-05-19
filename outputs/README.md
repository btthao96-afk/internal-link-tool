# Outputs — Kết quả chạy thử các skill

Folder này chứa output sinh ra từ các lần chạy thử các skill trong `.claude/skills/`.

## Cấu trúc

```
outputs/
├── internal-link-skill/           # Skill 1
│   ├── keywords_demo.json         # output extract_keywords.py
│   └── relevance_demo.json        # output relevance_score.py
├── semantic-internal-linker/      # Skill 2
│   ├── clusters.json              # bước 1: 139 URLs → 8 clusters
│   ├── graph.json                 # bước 2: semantic graph + PageRank
│   ├── link_pairs.json            # bước 3: 309 link pairs allocated
│   ├── link_pairs_with_anchor.json# bước 4: + anchor distribution
│   ├── internal_links.json        # bước 5: + placement (final)
│   ├── internal_links.xlsx        # Excel 3 sheets
│   ├── report.md                  # báo cáo MD
│   ├── demo_5urls_internal_links.json   # demo với 5 URLs iPhone
│   └── demo_5urls_internal_links.xlsx
├── inlink-stats/                  # Skill 3
│   ├── stats.json                 # phân tích đầy đủ
│   ├── report.md
│   ├── report.xlsx                # 11 sheets
│   └── report.html                # dashboard Chart.js
└── usage-guide/                   # Skill 4 (skill này không sinh file)
```

## Prompt đã dùng để sinh output

### Skill 1 — `internal-link-skill`
```
/internal-link-skill Trích xuất top 10 keyword từ source.txt rồi tính relevance score với pages.json
```
Output: `keywords_demo.json`, `relevance_demo.json`

### Skill 2 — `semantic-internal-linker`
```
/semantic-internal-linker Build internal link map cho 138 URL của noithattheone.vn
với 30 anchor đã chuẩn bị, mỗi URL có 3 out + 3 in
```
Output: `clusters.json`, `graph.json`, `link_pairs*.json`, `internal_links.json/.xlsx`, `report.md`

Demo 5 URLs iPhone:
```
/semantic-internal-linker Chạy pipeline trên demo/urls.csv (5 bài iPhone) và demo/anchors.csv
```
Output: `demo_5urls_internal_links.json/.xlsx`

### Skill 3 — `inlink-stats`
```
/inlink-stats Phân tích 309 internal link từ output skill 2, sinh đầy đủ 4 format JSON/MD/XLSX/HTML
```
Output: `stats.json`, `report.md`, `report.xlsx`, `report.html`

### Skill 4 — `usage-guide`
Skill này dùng để trả lời câu hỏi về cách dùng → không sinh file output cụ thể, chỉ trả về text trong chat.

## Reproduce

Để chạy lại các skill và sinh output mới:

```bash
# Skill 1
cd .claude/skills/internal-link-skill
python3 scripts/extract_keywords.py SOURCE.txt --top 10

# Skill 2 (full pipeline)
cd .claude/skills/semantic-internal-linker
python3 scripts/run_pipeline.py --urls inputs/urls.csv --anchors inputs/anchors.csv --out outputs/

# Skill 3 (analyze + 4 formats)
cd .claude/skills/inlink-stats
python3 scripts/analyze.py --input ../semantic-internal-linker/outputs/internal_links.json --out outputs/ --format all
```

Hoặc chạy test harness để verify cả 4 skill:
```bash
bash .claude/skills/test_skills.sh
# Expected: Passed: 15 | Failed: 0
```
