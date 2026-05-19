# 04 — Skill `semantic-internal-linker`

**Dùng để:** build internal link map cho toàn site (5-10000 URLs) qua 5 bước pipeline.

## Path
`.claude/skills/semantic-internal-linker/`

## Input

### a. `urls.csv`
```csv
url,title,content,main_keyword
/iphone-18-camera,Đánh giá camera iPhone 18,"Nội dung bài 500-2000 từ...",camera iphone 18
```

### b. `anchors.csv`
```csv
anchor,ratio,type
camera iphone 18,15,exact
zoom quang học iphone 18,15,partial
xem thêm,5,generic
```
**Rules:** `sum(ratio) = 100`, `type ∈ {exact, partial, long-tail, branded, generic}`.

> 💡 Đã có CSV xuất từ Google Sheet? Dùng `prepare_input.py`:
> ```bash
> python scripts/prepare_input.py --raw raw.csv \
>     --urls-out inputs/urls.csv --anchors-out inputs/anchors.csv
> ```

Xem `examples/urls-sample.csv` và `examples/anchors-sample.csv` của skill `usage-guide`.

## Chạy full pipeline (khuyến nghị)

```bash
cd .claude/skills/semantic-internal-linker

python scripts/run_pipeline.py \
    --urls inputs/urls.csv \
    --anchors inputs/anchors.csv \
    --out outputs/ \
    --k-out 3 \
    --k-in 3
```

5 bước chạy lần lượt, in log:
```
OK: 139 URLs → 8 clusters → outputs/clusters.json
OK: graph với 139 nodes, top-8 neighbors → outputs/graph.json
OK: 309 link pairs (orphans=11) → outputs/link_pairs.json
OK: 309 pairs có anchor → outputs/link_pairs_with_anchor.json
OK: 309 internal links → outputs/internal_links.json + outputs/internal_links.xlsx
```

## Chạy từng bước (debug)

```bash
# Bước 1: clustering (KMeans trên embedding)
python scripts/step1_semantic_clustering.py --urls inputs/urls.csv --out outputs/clusters.json --k 8

# Bước 2: graph (networkx + PageRank)
python scripts/step2_semantic_graph.py --clusters outputs/clusters.json --out outputs/graph.json --top 8

# Bước 3: allocation (mỗi node 3 OUT, 3 IN; không self-link, không vòng tròn)
python scripts/step3_link_allocation.py --graph outputs/graph.json --out outputs/link_pairs.json --k-out 3 --k-in 3

# Bước 4: anchor distribution (quota theo ratio)
python scripts/step4_anchor_distribution.py \
    --pairs outputs/link_pairs.json \
    --anchors inputs/anchors.csv \
    --out outputs/link_pairs_with_anchor.json

# Bước 5: placement (intro/body/outro)
python scripts/step5_link_placement.py \
    --pairs outputs/link_pairs_with_anchor.json \
    --urls inputs/urls.csv \
    --out-json outputs/internal_links.json \
    --out-xlsx outputs/internal_links.xlsx
```

## Output

**`outputs/internal_links.json`** — list của object:
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

**`outputs/internal_links.xlsx`** — 3 sheets: `internal_links`, `position_summary`, `anchor_summary`.

## Tinh chỉnh tham số

| Tham số | Default | Khi nào thay |
|---------|---------|--------------|
| `--k` (số cluster) | auto `sqrt(N/2)` | Site có cấu trúc silo rõ → set thủ công |
| `--top` (neighbors / node) | 8 | Site nhỏ < 20 URLs → giảm 4-5 |
| `--k-out` | 3 | Bài dài 2000+ từ → 5; bài ngắn → 2 |
| `--k-in` | 3 | Trang authority cần boost → 5-10 |

## Sinh report bổ sung

```bash
python scripts/generate_report.py --links outputs/internal_links.json --out outputs/report.md
```
