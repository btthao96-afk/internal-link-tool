# 06 — Workflow end-to-end (kết hợp 3 skill)

Quy trình build internal link **từ A đến Z** cho 1 website mới.

## Sơ đồ

```
Crawl URLs   →   Skill 1 lấy keyword GSC   →   Skill 2 build link map   →   Skill 3 audit
   ↓                       ↓                            ↓                          ↓
urls.csv             anchors.csv              internal_links.json           stats.json
                                              .xlsx + report.md            .xlsx + .html
```

## Step-by-step

### Bước 0: thu thập URL
Crawl site hoặc xuất sitemap thành CSV với cột `url, title, content, main_keyword`.

→ `inputs/urls.csv`

### Bước 1: chuẩn bị anchor (tuỳ chọn, dùng skill 1)

```bash
# Lấy top keyword đang ranking từ Google Search Console
cd .claude/skills/internal-link-skill
python scripts/api_integration.py gsc-keywords \
    --site sc-domain:example.com \
    --page https://example.com/iphone-18
```

Hoặc dùng Claude API gợi ý anchor:
```bash
python scripts/api_integration.py suggest-anchors \
    --target-url ... --keyword "iphone 18" -n 5
```

→ Ghi vào `anchors.csv` với type tương ứng.

### Bước 2: build internal link map (skill 2)

```bash
cd ../semantic-internal-linker
python scripts/run_pipeline.py \
    --urls inputs/urls.csv \
    --anchors inputs/anchors.csv \
    --out outputs/
```

→ `outputs/internal_links.json` + `.xlsx`

### Bước 3: audit chất lượng (skill 3)

```bash
cd ../inlink-stats
python scripts/analyze.py \
    --input ../semantic-internal-linker/outputs/internal_links.json \
    --out outputs/ --format all
```

→ `outputs/stats.json` + `report.html`

### Bước 4: review báo cáo, sửa lỗi nếu cần

```bash
open outputs/report.html   # dashboard browser
open outputs/report.xlsx   # Excel
```

- Nhiều `confused_anchors`? → Thêm anchor mới vào `anchors.csv`, chạy lại bước 2
- Có `orphans`? → Thêm bài "bridge" hoặc tăng `--k-in` trong skill 2

### Bước 5 (tuỳ chọn): so sánh build lần sau

```bash
# Lưu baseline
cp outputs/stats.json outputs/stats-baseline.json

# ... sửa code, chạy lại pipeline ...

# Diff
python scripts/compare.py \
    --before outputs/stats-baseline.json \
    --after outputs/stats.json \
    --out diff.md
```

## Tips tối ưu workflow

- **Cache embedding**: skill 2 sinh embedding lần đầu rất chậm (~1-2 phút cho 100 URLs). Lưu lại `clusters.json` để các lần sau chỉ chạy bước 2-5.
- **Iterative**: chạy bước 2 với `--k-out 2` trước (link sparse hơn), audit, rồi tăng dần nếu cần.
- **A/B**: build 2 phiên bản với anchor khác nhau, dùng `compare.py` xem cái nào tốt hơn về anti-pattern.
