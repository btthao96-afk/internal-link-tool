# 01 — Kiến trúc tổng quan

Bộ 3 skill internal link hoạt động độc lập nhưng nối tiếp được thành 1 pipeline hoàn chỉnh.

## Sơ đồ

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

## Bảng so sánh

| Skill | Khi nào dùng | Input chính | Output chính |
|-------|--------------|-------------|--------------|
| 1. `internal-link-skill` | Phân tích nhanh 1 bài, tìm trang liên quan | text + sitemap | keyword list, top relevant pages |
| 2. `semantic-internal-linker` | Build internal link map cho **toàn site** (10-10000 URLs) | urls.csv + anchors.csv | internal_links.json/.xlsx |
| 3. `inlink-stats` | Audit chất lượng internal link hiện có | output skill 2 (hoặc CSV bất kỳ) | stats.json + report HTML/MD/XLSX |
| 4. `usage-guide` | Hỏi cách dùng | (skill này) | hướng dẫn |

## Quan hệ giữa các skill

- Skill 2 dùng output của skill 1 **làm input** (keyword + relevance để chọn anchor)
- Skill 3 dùng output của skill 2 **làm input** (link list để audit)
- Skill 4 (usage-guide) đọc tất cả các SKILL.md còn lại

## Quy ước đặt tên

- Mỗi skill ở `.claude/skills/<tên>/SKILL.md` (frontmatter `name` + `description`)
- Scripts ở `scripts/`, tài liệu ở `references/`, mẫu ở `templates/`, output ví dụ ở `examples/`
- Output thực sinh khi chạy ở `outputs/` (gitignore tuỳ chọn)
