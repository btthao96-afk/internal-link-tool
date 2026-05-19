# 05 — Skill `inlink-stats`

**Dùng để:** audit chất lượng internal link đã có. Phát hiện orphan, anti-pattern, đo anchor diversity.

## Path
`.claude/skills/inlink-stats/`

## Chạy cơ bản (JSON + MD)

```bash
cd .claude/skills/inlink-stats

python scripts/analyze.py \
    --input ../semantic-internal-linker/outputs/internal_links.json \
    --out outputs/
```
Tạo `outputs/stats.json` + `outputs/report.md`.

## Chạy đầy đủ (JSON + MD + Excel + HTML)

```bash
python scripts/analyze.py --input <links> --out outputs/ --format all
```
Thêm:
- `report.xlsx` — 11 sheets (overview, per_url, anchor_type, top_anchors, cluster, orphans, weak_pages, authority, over_opt, confused_anchors, long_chains)
- `report.html` — Chart.js dashboard

## Input format

**A. JSON từ skill 2:**
```bash
python scripts/analyze.py --input internal_links.json --out outputs/
```

**B. CSV tự nhập:**
```csv
source,target,anchor,anchor_type,cluster
/a,/b,camera iphone 18,exact,iphone
/b,/c,xem thêm,generic,iphone
```
```bash
python scripts/analyze.py --input my_links.csv --out outputs/
```

Xem `templates/input-schema.md` trong skill `inlink-stats` để biết format đầy đủ.

## Cấu trúc `stats.json`

```json
{
  "overview": {
    "total_links": 309,
    "unique_urls": 137,
    "avg_inbound": 2.26,
    "avg_outbound": 2.36,
    "density": 0.0166,
    "same_cluster_pct": 91.3
  },
  "anchor_type_distribution": { "long-tail": 296, "generic": 7, "partial": 6 },
  "top_anchors": [["cách lắp ghế xoay văn phòng", 32]],
  "per_url": [{"url":"/a","inbound":3,"outbound":2,"anchor_diversity":2}],
  "orphans": ["/x", "/y"],
  "authority_pages": [{"url":"/iphone-18", "inbound": 15}],
  "anti_patterns": {
    "over_optimization_targets": [],
    "confused_anchors": [{"anchor":"...", "targets":[...]}],
    "self_links": [],
    "duplicate_pairs": [],
    "generic_anchor_pct": 2.3,
    "long_chains": [["/a","/b","/c","/d"]]
  }
}
```

## So sánh 2 build

```bash
python scripts/compare.py \
    --before old/stats.json \
    --after new/stats.json \
    --out diff.md
```
Báo cáo metric tăng/giảm, orphan mới xuất hiện/mất.

## 6 anti-pattern skill detect tự động

| Pattern | Phát hiện | Cách fix |
|---------|-----------|----------|
| **Over-optimization** | 1 target nhận > 50% exact anchor | Pha trộn partial/long-tail |
| **Confused anchor** | 1 anchor exact → > 1 target | Mỗi anchor exact → 1 target |
| **Self-link** | source == target | Bug pipeline, fix code |
| **Duplicate pair** | (source, target) trùng | Dedupe trước export |
| **Generic > 20%** | nhiều "xem thêm", "tại đây" | Thay anchor có ngữ cảnh |
| **Long chain ≥ 4** | A→B→C→D→E | Authority trỏ trực tiếp tới end |

Chi tiết: `.claude/skills/inlink-stats/references/anti-patterns.md`.
