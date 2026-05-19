---
name: inlink-stats
description: Phân tích thống kê toàn bộ internal link của website. Đếm inbound/outbound mỗi URL, phát hiện orphan & authority page, phân bổ anchor theo type, anchor diversity per target, cluster distribution, anti-pattern (lặp anchor, link chain dài). Output: bảng JSON tóm tắt, Excel multi-sheet, báo cáo HTML có chart, báo cáo Markdown. Input: file JSON/CSV chứa cặp (source, target, anchor, ...). Dùng khi user nói "thống kê internal link", "audit inlink", "báo cáo link nội bộ", hoặc "so sánh 2 build link".
---

# Inlink Stats

Skill phân tích thống kê internal link để audit cấu trúc liên kết nội bộ website.

## Khi nào dùng

- "Thống kê internal link", "audit inlink", "báo cáo link nội bộ"
- "Đếm bao nhiêu link vào trang X"
- "Trang nào đang orphan"
- "So sánh build A và build B"
- "Xuất Excel báo cáo inlink"

## Input

Skill nhận 1 trong 3 format:

### Format A: JSON từ skill [[semantic-internal-linker]]
```json
[{"source": "...", "target": "...", "anchor": "...", "anchor_type": "...", "position": "...", "cluster": "..."}]
```

### Format B: CSV thô
| Cột | Mô tả |
|-----|-------|
| `source` | URL nguồn |
| `target` | URL đích |
| `anchor` | Anchor text |
| `anchor_type` *(optional)* | exact / partial / branded / generic / long-tail |
| `cluster` *(optional)* | nhãn cụm chủ đề |

### Format C: Sitemap + crawl
- Cung cấp 1 list URL + 1 list edges (source, target) — skill sẽ tự suy anchor_type = unknown

## Output

| File | Mô tả |
|------|-------|
| `stats.json` | Toàn bộ số liệu dạng JSON (dùng cho automation) |
| `report.md` | Báo cáo Markdown đầy đủ (KPI, top tables) |
| `report.html` | Báo cáo HTML có biểu đồ (Chart.js qua CDN) |
| `report.xlsx` | Excel multi-sheet: overview · per-url · per-anchor · orphans · anti-patterns |

## Các nhóm metric

### 1. Tổng quan
- Total links / unique sources / unique targets
- Avg inbound, avg outbound
- Same-cluster ratio
- Density = links / (n_urls × (n_urls-1))

### 2. Per-URL
- **Inbound count** (in-degree) — bao nhiêu trang trỏ tới
- **Outbound count** (out-degree)
- **PageRank-like score** = inbound × log(avg_inbound_quality)
- **Anchor diversity** — số anchor unique cho 1 target (càng cao càng tốt)
- **Cluster** — nhãn cụm

### 3. Per-Anchor
- Tần suất sử dụng
- Số target khác nhau anchor này trỏ tới (cao = anchor "vạn năng" — xấu)
- Phân bổ anchor_type (theo % yêu cầu)

### 4. Orphans & Authority
- **Orphans**: URLs có inbound = 0
- **Weak pages**: inbound < 2
- **Authority pages**: top 10% inbound cao nhất

### 5. Anti-patterns
- 🚨 1 target nhận > 50% anchor cùng `exact` → over-optimization
- 🚨 1 anchor `exact` trỏ tới > 1 target → confused Google
- 🚨 Link chain dài (A→B→C→D→E…) → crawl waste
- 🚨 Anchor "generic" chiếm > 20% → thiếu context
- 🚨 Self-link hoặc duplicate (s, t) — trick test

## Cách chạy

```bash
cd .claude/skills/inlink-stats

# Analyze + sinh stats.json
python scripts/analyze.py --input <links.json|links.csv> --out outputs/stats.json

# Sinh report đầy đủ (md + html + xlsx)
python scripts/analyze.py --input <links> --out outputs/ --format all

# So sánh 2 build
python scripts/compare.py --before old/stats.json --after new/stats.json --out diff.md
```

## Tài nguyên đi kèm

- `scripts/`
  - `analyze.py` — phân tích chính, sinh stats.json + report.md
  - `export_excel.py` — multi-sheet Excel
  - `generate_html.py` — HTML có Chart.js
  - `compare.py` — diff giữa 2 build
- `references/`
  - `seo-metrics.md` — giải thích từng metric
  - `anti-patterns.md` — chi tiết các pattern xấu
- `templates/input-schema.md` — mô tả format input
- `examples/sample-stats-report.md` — output mẫu

## Tích hợp với skill khác

- Input thường đến từ [[semantic-internal-linker]] (`outputs/internal_links.json`)
- Output có thể đẩy lên Pages dashboard dưới dạng widget thống kê
- Có thể chạy định kỳ (cron) để so sánh build trước/sau
