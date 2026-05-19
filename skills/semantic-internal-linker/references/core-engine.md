# Core Engine

## 1. NLP / AI

### Embedding
- Mô hình: `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2`
  - Hỗ trợ tiếng Việt + 50 ngôn ngữ khác
  - 384 chiều, đủ nhẹ để chạy CPU
- Fallback khi không cài được: TF-IDF (`sklearn.feature_extraction.text.TfidfVectorizer`)
  - n-gram 1-2, max 2048 features
  - Vector được L2-normalize trước khi tính cosine

### Semantic similarity
- Cosine similarity giữa embedding
- Range [-1, 1]; thực tế > 0 sau khi normalize
- Threshold đề xuất: ≥ 0.3 để xét candidate, ≥ 0.5 để ưu tiên cao

### Topic clustering
- KMeans với `k = sqrt(N/2)` (auto)
- Có thể thay bằng `AgglomerativeClustering` với `distance_threshold` nếu muốn cluster động
- Nhãn cluster sinh tự động bằng các token chung xuất hiện nhiều nhất trong title + keyword

## 2. Graph Engine

### Internal link graph
- `networkx.DiGraph`
- Node: URL, attribute (title, keyword, cluster_id, pagerank)
- Edge: weight = cosine similarity, attribute `same_cluster`

### PageRank
- Dùng `networkx.pagerank` với edge weight
- Trang có PageRank cao = "authority" — ưu tiên nhận inbound link
- Mục đích: phân bổ link juice hợp lý

### Crawl depth
- Crawl depth = BFS hops từ root (homepage hoặc node PageRank cao nhất)
- Mọi node phải có depth ≤ 3
- Phát hiện orphan: node có `in_degree == 0` sau khi allocate

## 3. SEO Engine

### Anchor ratio control
- Quota = `floor(ratio% × total_pairs)`
- Khi quota dư, gán cho anchor có ratio cao nhất
- Khi 1 anchor đã hết quota → bỏ qua, tìm anchor tiếp theo theo điểm semantic match

### Link juice distribution
- Source PageRank cao → ưu tiên link tới target cần boost (PageRank thấp)
- Tránh trang authority chỉ link cho nhau (echo chamber)

### Orphan prevention
- Sau bước 3, nếu còn URL với `in_count == 0`:
  - Tìm source phù hợp nhất từ candidate pool
  - Cho phép vượt quota out (k_out + 1) để rescue orphan
- Mọi URL phải có ≥ 1 inbound link

### Anti over-optimization
- 1 target không nhận quá 50% anchor cùng type `exact`
- 1 anchor exact không link về > 1 target khác nhau (giữ "anchor → 1 target" map)
- Distribution lý tưởng (cho 1 target): 10-20% exact, 30-40% partial, 20-30% long-tail, 10-20% branded, 10% generic
