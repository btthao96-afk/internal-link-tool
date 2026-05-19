# Hướng dẫn sử dụng — 3 Skill Internal Link

Bộ skill Claude Code này gồm 3 skill độc lập + 1 web dashboard live, dùng để **tự động hóa toàn bộ quy trình xây internal link cho website**: từ phân tích nội dung, đề xuất link, tới audit chất lượng.

> **Mục lục**
> 1. [Kiến trúc tổng quan](#1-kiến-trúc-tổng-quan)
> 2. [Cài đặt](#2-cài-đặt-1-lần-duy-nhất)
> 3. [Skill 1: internal-link-skill](#3-skill-1--internal-link-skill)
> 4. [Skill 2: semantic-internal-linker](#4-skill-2--semantic-internal-linker)
> 5. [Skill 3: inlink-stats](#5-skill-3--inlink-stats)
> 6. [Workflow end-to-end](#6-workflow-end-to-end-kết-hợp-cả-3-skill)
> 7. [Dùng từ Claude Code (tự động)](#7-dùng-từ-claude-code-tự-động-gọi-skill)
> 8. [Xem demo live](#8-xem-demo-live)
> 9. [FAQ & troubleshooting](#9-faq--troubleshooting)

---

## 1. Kiến trúc tổng quan

```
┌───────────────────────┐    ┌─────────────────────────┐    ┌──────────────────┐
│ internal-link-skill   │    │ semantic-internal-linker│    │  inlink-stats    │
│ (basic, single page)  │ ─▶ │ (pipeline 5 bước)       │ ─▶ │  (audit + stats) │
│                       │    │                         │    │                  │
│ extract_keywords      │    │ Step 1-5:               │    │ analyze.py       │
│ relevance_score       │    │ cluster → graph         │    │ compare.py       │
│ api_integration       │    │  → allocation → anchor  │    │ export_excel.py  │
│  (Claude API + GSC)   │    │  → placement            │    │ generate_html.py │
└───────────────────────┘    └─────────────────────────┘    └──────────────────┘
         │                              │                          │
         ▼                              ▼                          ▼
   keywords.json                  internal_links.json        stats.json
   relevance.json                 .xlsx · report.md          .xlsx · .html · .md
```

| Skill | Khi nào dùng | Input chính | Output chính |
|-------|--------------|-------------|--------------|
| 1. `internal-link-skill` | Phân tích nhanh 1 bài, tìm trang liên quan để link | text + sitemap | keyword list, top relevant pages |
| 2. `semantic-internal-linker` | Build internal link map cho **toàn site** (10-10000 URLs) | urls.csv + anchors.csv | internal_links.json/.xlsx + graph |
| 3. `inlink-stats` | Audit chất lượng internal link hiện có | output của skill 2 (hoặc bất kỳ link list) | stats.json + report HTML/MD/XLSX |

---

## 2. Cài đặt (1 lần duy nhất)

### 2.1 Yêu cầu hệ thống
- **Python 3.10+**
- **Node 18+** (chỉ cần nếu chạy web dashboard local)
- macOS / Linux / Windows (WSL khuyến nghị)

### 2.2 Clone repo
```bash
git clone https://github.com/btthao96-afk/internal-link-tool.git
cd internal-link-tool
```

### 2.3 Cài Python deps cho skill 2 (cần nhất)
```bash
cd .claude/skills/semantic-internal-linker
pip install -r requirements.txt
```

Hoặc cài chung cho cả 3 skill:
```bash
pip install pandas numpy scikit-learn networkx openpyxl sentence-transformers
```

### 2.4 (Tùy chọn) Cài deps mở rộng cho skill 1
```bash
# Nếu muốn dùng api_integration.py:
pip install anthropic                              # Claude API
pip install google-api-python-client google-auth   # Google Search Console
```

---

## 3. Skill 1 — `internal-link-skill`

**Dùng để:** phân tích nhanh 1 bài viết, trích xuất keyword, tìm các trang liên quan trong sitemap để gợi ý link.

### 3.1 Trích xuất keyword
```bash
cd .claude/skills/internal-link-skill

# Input: 1 file text
python scripts/extract_keywords.py path/to/bai-viet.txt --top 20
```
**Output (stdout JSON):**
```json
{
  "source": "path/to/bai-viet.txt",
  "keywords": [
    {"keyword": "internal", "count": 12, "frequency": 0.045},
    {"keyword": "seo", "count": 9, "frequency": 0.034}
  ],
  "bigrams": [{"phrase": "internal link", "count": 8}]
}
```

### 3.2 Tính độ liên quan giữa source và danh sách trang
```bash
# pages.json format: [{"url":"...","title":"...","content":"..."}]
python scripts/relevance_score.py source.txt pages.json --min-score 60
```
**Output:** danh sách trang với điểm 0-100, đã lọc theo `--min-score`.

### 3.3 Tích hợp với Claude API (gợi ý anchor tự nhiên)
```bash
export ANTHROPIC_API_KEY="sk-ant-..."
python scripts/api_integration.py suggest-anchors \
    --target-url https://example.com/iphone-18 \
    --keyword "iphone 18" \
    -n 5
```
Claude API sẽ trả về 5 anchor text tự nhiên, đa dạng.

### 3.4 Tích hợp với Google Search Console
```bash
export GSC_CREDENTIALS_JSON=/path/to/service-account.json
python scripts/api_integration.py gsc-keywords \
    --site sc-domain:example.com \
    --page https://example.com/iphone-18
```
Lấy top 25 keyword đang ranking cho page → dùng làm anchor exact.

---

## 4. Skill 2 — `semantic-internal-linker`

**Dùng để:** xây dựng map internal link tự động cho toàn site (5-10000 URLs) theo 5 bước pipeline.

### 4.1 Chuẩn bị input

#### a. `urls.csv` — danh sách URL
```csv
url,title,content,main_keyword
/iphone-18-camera,Đánh giá camera iPhone 18,"Nội dung bài 500-2000 từ...",camera iphone 18
/iphone-18-zoom,iPhone 18 zoom quang học,"...",zoom iphone 18
```

#### b. `anchors.csv` — danh sách anchor + ratio
```csv
anchor,ratio,type
camera iphone 18,15,exact
zoom quang học iphone 18,15,partial
đánh giá chi tiết iphone 18,20,long-tail
iphone 18 - nội thất the one,5,branded
xem thêm,5,generic
```
**Quy tắc:** `sum(ratio) = 100`, `type ∈ {exact, partial, long-tail, branded, generic}`.

> 💡 **Đã có CSV xuất từ Google Sheet?** Dùng `scripts/prepare_input.py` để tự parse:
> ```bash
> python scripts/prepare_input.py --raw raw-input.csv --urls-out inputs/urls.csv --anchors-out inputs/anchors.csv
> ```

### 4.2 Chạy full pipeline (khuyến nghị)
```bash
cd .claude/skills/semantic-internal-linker

python scripts/run_pipeline.py \
    --urls inputs/urls.csv \
    --anchors inputs/anchors.csv \
    --out outputs/ \
    --k-out 3 \
    --k-in 3
```

Pipeline chạy lần lượt 5 bước, mỗi bước in log:
```
OK: 139 URLs → 8 clusters → outputs/clusters.json
OK: graph với 139 nodes, top-8 neighbors → outputs/graph.json
OK: 309 link pairs (orphans=11) → outputs/link_pairs.json
OK: 309 pairs có anchor → outputs/link_pairs_with_anchor.json
OK: 309 internal links → outputs/internal_links.json + outputs/internal_links.xlsx
```

### 4.3 Chạy từng bước (debug / tinh chỉnh)
```bash
# Bước 1: clustering
python scripts/step1_semantic_clustering.py --urls inputs/urls.csv --out outputs/clusters.json --k 8

# Bước 2: graph
python scripts/step2_semantic_graph.py --clusters outputs/clusters.json --out outputs/graph.json --top 8

# Bước 3: allocation (mặc định 3 out, 3 in)
python scripts/step3_link_allocation.py --graph outputs/graph.json --out outputs/link_pairs.json --k-out 3 --k-in 3

# Bước 4: anchor distribution
python scripts/step4_anchor_distribution.py --pairs outputs/link_pairs.json --anchors inputs/anchors.csv --out outputs/link_pairs_with_anchor.json

# Bước 5: placement (intro/body/outro)
python scripts/step5_link_placement.py --pairs outputs/link_pairs_with_anchor.json --urls inputs/urls.csv \
    --out-json outputs/internal_links.json --out-xlsx outputs/internal_links.xlsx
```

### 4.4 Hiểu output

**`outputs/internal_links.json`** — mảng các object:
```json
{
  "source": "/iphone-18-camera",
  "target": "/iphone-18-zoom",
  "anchor": "zoom quang học iphone 18",
  "anchor_type": "partial",
  "position": "intro",
  "snippet": "iPhone 18 trang bị cảm biến camera mới 48MP.",
  "semantic_score": 0.78,
  "cluster": "iphone / camera / năng",
  "same_cluster": true
}
```

**`outputs/internal_links.xlsx`** — 3 sheet:
- `internal_links` — danh sách đầy đủ
- `position_summary` — đếm theo intro/body/outro
- `anchor_summary` — đếm theo anchor + type

### 4.5 Tinh chỉnh tham số

| Tham số | Default | Khi nào thay |
|---------|---------|--------------|
| `--k` (số cluster) | auto `sqrt(N/2)` | Site có cấu trúc silo rõ → set thủ công |
| `--top` (neighbors / node) | 8 | Site nhỏ < 20 URLs → giảm 4-5 |
| `--k-out` | 3 | Bài dài 2000+ từ → 5; bài ngắn → 2 |
| `--k-in` | 3 | Trang authority cần boost → 5-10 |
| `--min-score` | (n/a, dùng trong skill 1) | — |

### 4.6 Sinh báo cáo MD bổ sung
```bash
python scripts/generate_report.py --links outputs/internal_links.json --out outputs/report.md
```

---

## 5. Skill 3 — `inlink-stats`

**Dùng để:** audit chất lượng internal link đã có. Phát hiện orphan, anti-pattern, đo anchor diversity.

### 5.1 Phân tích cơ bản (sinh JSON + MD)
```bash
cd .claude/skills/inlink-stats

python scripts/analyze.py \
    --input ../semantic-internal-linker/outputs/internal_links.json \
    --out outputs/
```
Tạo `outputs/stats.json` + `outputs/report.md`.

### 5.2 Sinh đầy đủ 4 format (JSON + MD + Excel + HTML)
```bash
python scripts/analyze.py --input <links> --out outputs/ --format all
```
Thêm:
- `report.xlsx` — 11 sheet (overview, per_url, anchor_type, top_anchors, cluster, orphans, weak_pages, authority, over_opt, confused_anchors, long_chains)
- `report.html` — báo cáo có Chart.js chart

### 5.3 Input format khác

Skill 3 nhận **3 format**:

**A. JSON từ skill 2** (mặc định):
```bash
python scripts/analyze.py --input internal_links.json --out outputs/
```

**B. CSV tùy biến:**
```csv
source,target,anchor,anchor_type,cluster
/a,/b,camera iphone 18,exact,iphone
/b,/c,xem thêm,generic,iphone
```
```bash
python scripts/analyze.py --input my_links.csv --out outputs/
```

**C. Sitemap + edge list:** convert sang format CSV trước.

### 5.4 Đọc output `stats.json`

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
  "top_anchors": [["cách lắp ghế xoay văn phòng", 32], ...],
  "per_url": [{"url":"/a","inbound":3,"outbound":2,"anchor_diversity":2,"cluster":"x"}],
  "orphans": ["/x", "/y"],
  "authority_pages": [{"url":"/iphone-18", "inbound": 15}],
  "anti_patterns": {
    "over_optimization_targets": [],
    "confused_anchors": [{"anchor":"...", "targets":["...","..."]}],
    "self_links": [],
    "duplicate_pairs": [],
    "generic_anchor_pct": 2.3,
    "long_chains": [["/a","/b","/c","/d"]]
  }
}
```

### 5.5 So sánh 2 build (regression check)
```bash
python scripts/compare.py \
    --before old/stats.json \
    --after new/stats.json \
    --out diff.md
```
Sinh báo cáo diff: metric nào tăng/giảm, orphan nào mới xuất hiện/mất đi.

### 5.6 Hiểu các anti-pattern

| Pattern | Cách phát hiện | Cách fix |
|---------|----------------|----------|
| **Over-optimization** | 1 target nhận > 50% exact anchor | Pha trộn: dùng partial/long-tail thay |
| **Confused anchor** | 1 anchor exact trỏ tới > 1 target | Mỗi anchor exact → 1 target |
| **Self-link** | source == target | Lỗi pipeline — kiểm tra code |
| **Duplicate pair** | (source, target) trùng | Dedupe trước export |
| **Generic > 20%** | nhiều "xem thêm", "tại đây" | Thay anchor có ngữ cảnh |
| **Long chain ≥ 4** | A→B→C→D→E | Authority trỏ trực tiếp tới end |

Xem chi tiết tại `.claude/skills/inlink-stats/references/anti-patterns.md`.

---

## 6. Workflow end-to-end (kết hợp cả 3 skill)

Quy trình build internal link **từ A đến Z** cho 1 website mới:

```bash
# === BƯỚC 0: thu thập URL ===
# Crawl site hoặc xuất sitemap thành CSV với cột url, title, content, main_keyword
# → inputs/urls.csv

# === BƯỚC 1: dùng skill 1 để chuẩn bị anchor (tùy chọn) ===
# Lấy top keyword đang rank từ Google Search Console
cd .claude/skills/internal-link-skill
python scripts/api_integration.py gsc-keywords --site sc-domain:example.com --page https://...
# → ghi vào anchors.csv với type tương ứng

# Hoặc dùng Claude API gợi ý anchor tự nhiên
python scripts/api_integration.py suggest-anchors --target-url ... --keyword ...

# === BƯỚC 2: build internal link map với skill 2 ===
cd ../semantic-internal-linker
python scripts/run_pipeline.py \
    --urls inputs/urls.csv \
    --anchors inputs/anchors.csv \
    --out outputs/

# → outputs/internal_links.json + .xlsx

# === BƯỚC 3: audit chất lượng với skill 3 ===
cd ../inlink-stats
python scripts/analyze.py \
    --input ../semantic-internal-linker/outputs/internal_links.json \
    --out outputs/ --format all

# → outputs/stats.json + report.html (mở browser xem)

# === BƯỚC 4: review báo cáo, sửa lỗi nếu cần ===
open outputs/report.html   # xem dashboard
open outputs/report.xlsx   # xem Excel

# Nếu có nhiều confused anchor → thêm anchor mới vào anchors.csv, chạy lại bước 2
# Nếu có orphan → thêm bài viết bridge để link tới

# === BƯỚC 5 (tùy chọn): so sánh build lần sau ===
cp outputs/stats.json outputs/stats-baseline.json
# ... sau khi sửa và chạy lại ...
python scripts/compare.py --before outputs/stats-baseline.json --after outputs/stats.json --out diff.md
```

---

## 7. Dùng từ Claude Code (tự động gọi skill)

Cả 3 skill có frontmatter trong `SKILL.md` nên Claude Code sẽ **tự nhận diện và gọi đúng skill** khi user mô tả việc cần làm.

### Ví dụ prompt → skill nào được gọi

| Prompt user | Skill được trigger |
|-------------|---------------------|
| "Trích xuất keyword từ bài này" | `internal-link-skill` |
| "Tìm các trang liên quan để link tới" | `internal-link-skill` |
| "Build internal link cho 100 URLs này" | `semantic-internal-linker` |
| "Tạo semantic graph của các bài viết" | `semantic-internal-linker` |
| "Phân bổ anchor theo ratio" | `semantic-internal-linker` |
| "Audit internal link của site" | `inlink-stats` |
| "Trang nào đang orphan?" | `inlink-stats` |
| "So sánh build A và build B" | `inlink-stats` |

### Quy trình:
1. Mở Claude Code trong folder repo (`cd internal-link-tool && claude`)
2. Gõ yêu cầu bằng tiếng Việt tự nhiên
3. Claude sẽ tự gọi skill, chạy script, hiển thị output

---

## 8. Xem demo live

3 trang demo đang chạy trên GitHub Pages (cập nhật tự động khi push lên `main`):

| URL | Nội dung |
|-----|----------|
| https://btthao96-afk.github.io/internal-link-tool/skill-demo.html | Demo skill 2 — 5 URLs iPhone, graph tương tác (vis.js), bảng 10 links |
| https://btthao96-afk.github.io/internal-link-tool/stats-demo.html | Demo skill 3 — KPI, 2 chart (Chart.js), 6 anti-pattern indicator |
| https://github.com/btthao96-afk/internal-link-tool | Source code 3 skills |

Cả 2 trang demo dùng data thật từ skill chạy local — không cần backend.

---

## 9. FAQ & troubleshooting

### Q1: Script báo `ModuleNotFoundError: No module named 'pandas'`
```bash
pip install pandas numpy scikit-learn networkx openpyxl
```

### Q2: `sentence-transformers` chậm khi chạy lần đầu
Lần đầu sẽ download model (~120MB). Lần sau sẽ cache lại. Nếu môi trường không cài được thì skill tự fallback sang `TF-IDF` của sklearn — vẫn chạy nhưng độ chính xác semantic kém hơn ~10%.

### Q3: Có quá nhiều `orphans` sau khi chạy skill 2
- Tăng `--k-in` (ví dụ 5 thay vì 3)
- Hoặc tăng `--top` ở step 2 để có nhiều candidate hơn
- Nếu vẫn orphan → có thể URL đó cách quá xa các URL khác về semantic, cần viết bài "bridge"

### Q4: Anchor type toàn `long-tail` (skewed)
Do anchor trong `anchors.csv` đa số là cụm dài. Cần thêm vài anchor exact ngắn (2-3 từ) và partial.

### Q5: Position toàn `intro`
Do `content` trong `urls.csv` quá ngắn (< 5 câu). Skill tìm câu match anchor — câu đầu thường match. Bổ sung content thật 500+ từ.

### Q6: Excel báo lỗi mở
Cần `openpyxl >= 3.1`:
```bash
pip install --upgrade openpyxl
```

### Q7: Test skill có chạy được không?
```bash
bash .claude/skills/test_skills.sh
```
Phải thấy `Passed: 12 | Failed: 0`.

### Q8: Muốn thêm skill thứ 4
Tạo folder `.claude/skills/<tên-skill>/` với:
- `SKILL.md` có frontmatter `name` + `description`
- Scripts/templates/references tuỳ ý

Claude Code sẽ tự nhận skill mới khi mở lại session.

### Q9: Deploy bản chỉnh sửa lên Pages
```bash
# 1. Sửa code + chạy lại skill
# 2. Copy output mới vào public:
cp .claude/skills/semantic-internal-linker/outputs/internal_links.json \
   web-app/frontend/public/skill-demo/links.json

# 3. Commit + push
git add -A && git commit -m "Update demo data" && git push origin main

# 4. Workflow GitHub Actions tự build + deploy (~2-3 phút)
```

### Q10: Báo lỗi `Permission denied` khi push
Repo không có quyền — cần dùng SSH key hoặc Personal Access Token với scope `repo`.

---

## Tài nguyên thêm

- **Best practices SEO** — `.claude/skills/internal-link-skill/references/seo-best-practices.md`
- **Core engine NLP/Graph** — `.claude/skills/semantic-internal-linker/references/core-engine.md`
- **Tech stack production** — `.claude/skills/semantic-internal-linker/references/tech-stack.md`
- **Anti-patterns chi tiết** — `.claude/skills/inlink-stats/references/anti-patterns.md`
- **SEO metrics giải thích** — `.claude/skills/inlink-stats/references/seo-metrics.md`

---

**Maintainer:** btthao96 · **License:** xem `LICENSE` ở root repo · **Generated:** 2026-05-19
