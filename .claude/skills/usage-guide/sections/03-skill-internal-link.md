# 03 — Skill `internal-link-skill`

**Dùng để:** phân tích nhanh 1 bài viết, trích xuất keyword, tìm các trang liên quan trong sitemap.

## Path
`.claude/skills/internal-link-skill/`

## Scripts

### 3.1 `extract_keywords.py`
Trích xuất keyword + bigram từ file text.

```bash
cd .claude/skills/internal-link-skill
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

### 3.2 `relevance_score.py`
Tính độ liên quan giữa source và list trang đích.

```bash
# pages.json: [{"url":"...","title":"...","content":"..."}]
python scripts/relevance_score.py source.txt pages.json --min-score 60
```

Score 0-100, đã lọc theo `--min-score`.

### 3.3 `api_integration.py`

**Claude API — gợi ý anchor tự nhiên:**
```bash
export ANTHROPIC_API_KEY="sk-ant-..."
python scripts/api_integration.py suggest-anchors \
    --target-url https://example.com/iphone-18 \
    --keyword "iphone 18" \
    -n 5
```

**Google Search Console — top keyword ranking:**
```bash
export GSC_CREDENTIALS_JSON=/path/to/sa.json
python scripts/api_integration.py gsc-keywords \
    --site sc-domain:example.com \
    --page https://example.com/iphone-18
```

## Khi nào dùng skill này

- ✅ Phân tích 1 bài viết → tìm 5-10 trang để link
- ✅ Lấy keyword đang ranking từ GSC để dùng làm anchor exact
- ✅ Generate anchor text đa dạng bằng AI
- ❌ KHÔNG dùng cho > 100 URLs — chuyển sang skill 2

## Tài nguyên đi kèm

- `references/seo-best-practices.md` — quy tắc SEO internal linking
- `references/vi-stopwords.txt` — stopwords tiếng Việt
- `templates/anchor-text-patterns.md` — 5 pattern anchor
- `templates/report-template.md` — template báo cáo
- `examples/sample-output.md` — ví dụ output đầy đủ
