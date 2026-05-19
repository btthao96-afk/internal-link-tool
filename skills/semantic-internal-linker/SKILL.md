---
name: semantic-internal-linker
description: Tự động phân bổ internal link cho website dựa trên semantic clustering, semantic graph và anchor distribution. Đầu vào là danh sách URL (URL, title, content, keyword chính) và danh sách anchor (anchor text, tỉ lệ %, loại anchor). Đầu ra là JSON/Excel mapping source → target → anchor → vị trí chèn. Dùng khi user yêu cầu "build internal link map", "phân bổ anchor", "tạo semantic graph", hoặc "tự động internal linking" cho 1 danh sách URL.
---

# Semantic Internal Linker

Skill này biến danh sách URL + anchor thành 1 plan internal link hoàn chỉnh: chọn target dựa trên ngữ nghĩa, phân bổ anchor theo ratio đã định, và xác định vị trí chèn link trong bài.

## Input

### 1. Danh sách URL (CSV: `inputs/urls.csv`)
| Cột | Mô tả |
|-----|-------|
| `url` | URL đầy đủ |
| `title` | Tiêu đề bài viết |
| `content` | Nội dung text (có thể rút gọn 500-2000 từ) |
| `main_keyword` | Keyword chính của trang |

### 2. Danh sách anchor (CSV: `inputs/anchors.csv`)
| Cột | Mô tả |
|-----|-------|
| `anchor` | Anchor text |
| `ratio` | Tỉ lệ % dự kiến (tổng = 100) |
| `type` | `exact` / `partial` / `branded` / `generic` |

Xem `templates/urls.csv` và `templates/anchors.csv` để biết format chuẩn.

## Flow Skill — 5 bước

### Bước 1 — Semantic Clustering
Phân nhóm URL theo chủ đề / ngữ nghĩa / topical relevance.
- Script: `scripts/step1_semantic_clustering.py`
- Engine: `sentence-transformers` (fallback `TF-IDF` của `sklearn`) → KMeans / Agglomerative
- Output: `outputs/clusters.json` (mỗi URL có `cluster_id` và `cluster_label`)

### Bước 2 — Semantic Graph
Tạo graph liên kết các URL.
- Script: `scripts/step2_semantic_graph.py`
- Engine: `networkx` với edge weight = cosine similarity giữa embedding
- Mỗi node có: `semantic_score`, `topical_relation`, `pagerank`
- Output: `outputs/graph.gpickle` + `outputs/graph.json`

### Bước 3 — Internal Link Allocation
Phân bổ link theo rule:
- Mỗi URL **có 3 link đi (outbound)**
- Mỗi URL **có 3 link đến (inbound)**
- KHÔNG self-link, KHÔNG duplicate, KHÔNG vòng lặp spam
- Ưu tiên semantic gần nhau (cùng cluster hoặc cosine ≥ 0.5)
- Script: `scripts/step3_link_allocation.py`
- Output: `outputs/link_pairs.json`

### Bước 4 — Anchor Distribution
Phân bổ anchor text theo:
- Ratio đã định trong `anchors.csv`
- Semantic match: anchor có keyword trùng với `main_keyword` của target được ưu tiên
- Anti over-optimization: 1 trang đích KHÔNG nhận quá 50% anchor cùng loại `exact`
- Script: `scripts/step4_anchor_distribution.py`
- Output: `outputs/link_pairs_with_anchor.json`

### Bước 5 — Link Placement
Xác định vị trí chèn link trong bài nguồn:
- `intro` (đầu bài, 100 từ đầu)
- `body` (giữa bài)
- `outro` (cuối bài)
- Ưu tiên placement tự nhiên: tìm câu trong `content` chứa anchor (hoặc gần nghĩa nhất)
- Script: `scripts/step5_link_placement.py`
- Output: `outputs/internal_links.json` + `outputs/internal_links.xlsx`

## Output

JSON format:
```json
{
  "source": "/iphone-18-camera",
  "target": "/iphone-18-zoom",
  "anchor": "zoom quang học iphone 18",
  "anchor_type": "partial",
  "position": "body",
  "snippet": "...đoạn văn trích từ source chứa anchor...",
  "semantic_score": 0.78,
  "cluster": "iphone-18-camera"
}
```

Excel format: `outputs/internal_links.xlsx` với các cột tương ứng + sheet `summary` thống kê.

## Chạy skill end-to-end

```bash
cd .claude/skills/semantic-internal-linker
pip install -r requirements.txt
python scripts/run_pipeline.py \
  --urls inputs/urls.csv \
  --anchors inputs/anchors.csv \
  --out outputs/
```

Hoặc chạy từng bước riêng để debug — mỗi script có thể chạy độc lập với input là output của bước trước.

## Core Engine

### NLP / AI
- **Embedding**: `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2` (hỗ trợ tiếng Việt)
- **Semantic similarity**: cosine similarity
- **Topic clustering**: KMeans hoặc Agglomerative trên embedding

### Graph Engine
- **Internal link graph**: `networkx.DiGraph`
- **PageRank**: tính trên graph để ưu tiên trang quan trọng nhận inbound
- **Crawl depth**: phát hiện orphan (in-degree = 0) và đảm bảo mọi node ≤ 3 hops từ root

### SEO Engine
- **Anchor ratio control**: enforce ratio từ `anchors.csv`
- **Link juice distribution**: ưu tiên link từ PageRank cao → trang cần boost
- **Orphan prevention**: mọi URL phải có ≥ 1 inbound link

## Tech Stack

### Basic (dùng được ngay)
- Python 3.10+
- `sklearn` (TF-IDF, KMeans)
- `sentence-transformers` (embedding)
- `networkx` (graph + PageRank)
- `pandas`, `openpyxl` (I/O CSV/Excel)

### Production (scale lớn, > 10k URLs)
- `FastAPI` — REST API
- `FAISS` — vector search nhanh
- `Neo4j` — lưu graph persistent
- `Redis queue` — async job

Xem chi tiết tại `references/tech-stack.md`.

## Quy tắc quan trọng

- **KHÔNG** override file output cũ — luôn lưu kèm timestamp
- **KIỂM TRA** sum(ratio) trong `anchors.csv` phải = 100
- **CẢNH BÁO** nếu < 10 URLs (không đủ để cluster có ý nghĩa)
- **TRÁNH** chèn nhiều link cùng anchor về 1 target (Google penalty)

## Tài nguyên đi kèm

- `scripts/` — 5 script Python cho 5 bước + `run_pipeline.py`
- `references/` — `core-engine.md`, `tech-stack.md`, `anchor-types.md`
- `templates/` — `urls.csv`, `anchors.csv` (template trống)
- `examples/` — input mẫu + output mẫu (JSON, Excel)
- `requirements.txt` — dependencies Python
