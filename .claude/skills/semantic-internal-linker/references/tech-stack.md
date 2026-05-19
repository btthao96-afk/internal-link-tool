# Tech Stack

## Basic — chạy local, < 1000 URLs

| Layer | Lib | Vai trò |
|-------|-----|---------|
| Embedding | `sentence-transformers` | Vector hoá title + content |
| Fallback | `sklearn.TfidfVectorizer` | Khi không có model HF |
| Clustering | `sklearn.cluster.KMeans` | Topic clustering |
| Graph | `networkx` | DiGraph + PageRank |
| Data I/O | `pandas`, `openpyxl` | CSV / Excel |

Cài đặt:
```bash
pip install -r requirements.txt
```

Chạy:
```bash
python scripts/run_pipeline.py \
  --urls inputs/urls.csv \
  --anchors inputs/anchors.csv \
  --out outputs/
```

## Production — scale > 10k URLs

| Layer | Service | Vai trò |
|-------|---------|---------|
| API | **FastAPI** | REST endpoint: POST `/build-links` |
| Vector index | **FAISS** | k-NN search trên embedding (millions of vectors) |
| Graph DB | **Neo4j** | Lưu graph persistent, query Cypher (PageRank server-side) |
| Job queue | **Redis + RQ / Celery** | Async build cho job dài |
| Storage | **S3 / GCS** | Lưu output JSON / Excel |
| Cache | **Redis** | Cache embedding theo URL hash |
| Observability | **Prometheus + Grafana** | Track pipeline latency, error rate |

### Kiến trúc production
```
┌────────┐    ┌────────┐    ┌──────────┐
│ Client │ →  │FastAPI │ →  │Redis Job │
└────────┘    └────────┘    │  Queue   │
                            └────┬─────┘
                                 ▼
        ┌──────────────────────────────────┐
        │ Worker (run_pipeline)            │
        │  ├─ Embed → FAISS index          │
        │  ├─ Cluster → Neo4j (Topic node) │
        │  ├─ Build graph → Neo4j edges    │
        │  ├─ Allocate links (Cypher)      │
        │  └─ Distribute anchors           │
        └──────────────────────────────────┘
                    ▼
            S3: internal_links.json / .xlsx
```

### Lựa chọn embedding production
- **Ngắn hạn**: chạy `sentence-transformers` trên GPU node
- **Dài hạn**: chuyển sang OpenAI `text-embedding-3-small` hoặc Cohere multilingual embed
  - Cache mạnh để giảm cost
- **Realtime**: pre-compute embedding khi URL được publish, đẩy vào FAISS index

### Anti-fragile
- Idempotent: cùng input phải ra cùng output (set random_state cho KMeans)
- Resumable: lưu intermediate output để rerun từng bước
- Version: gắn version cho mỗi build (`outputs/2026-05-18-v1/...`)
