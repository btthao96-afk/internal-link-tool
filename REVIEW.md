# REVIEW.md — Tự đánh giá BTVN

> Bài tập: Sử dụng Claude Code để xây 1 không gian làm việc cá nhân với ít nhất 3 skills.

---

## 1. Đối chiếu yêu cầu

### 1.1 Số lượng skill
**Yêu cầu:** ≥ 3 skills trong `.claude/skills/`
**Đã làm:** ✅ **4 skills**

| # | Skill | Mục đích |
|---|-------|----------|
| 1 | `internal-link-skill` | Phân tích nhanh 1 bài viết: extract keyword, relevance score, gọi API |
| 2 | `semantic-internal-linker` | Pipeline 5 bước build internal link map cho cả site |
| 3 | `inlink-stats` | Audit chất lượng + phát hiện 6 anti-pattern |
| 4 | `usage-guide` | Hướng dẫn cách dùng (skill meta — Claude tự gọi khi user hỏi) |

### 1.2 Có skill kết nối nền tảng ngoài (API / MCP / CLI)
**Yêu cầu:** ≥ 1 skill có integration
**Đã làm:** ✅

Skill `internal-link-skill` có file `scripts/api_integration.py` với 2 integration:
- **Claude API** (`anthropic` SDK) — gợi ý anchor text tự nhiên
- **Google Search Console API** (`googleapiclient`) — lấy top keyword đang ranking

Lệnh chạy:
```bash
ANTHROPIC_API_KEY=sk-ant-... python scripts/api_integration.py suggest-anchors --target-url URL --keyword KW
GSC_CREDENTIALS_JSON=/path/sa.json python scripts/api_integration.py gsc-keywords --site sc-domain:example.com --page URL
```

### 1.3 Có skill chứa files & folder bên cạnh SKILL.md
**Yêu cầu:** ≥ 1 skill có cấu trúc folder phụ
**Đã làm:** ✅ **Cả 4 skill đều có**, đặc biệt:

`semantic-internal-linker/` — phong phú nhất:
```
semantic-internal-linker/
├── SKILL.md
├── requirements.txt
├── scripts/        (8 file Python)
├── templates/      (urls.csv, anchors.csv)
├── references/     (core-engine.md, tech-stack.md, anchor-types.md)
├── examples/       (raw-input.csv)
├── inputs/         (urls.csv, anchors.csv chạy thật)
├── outputs/        (7 file output)
└── demo/           (5 URLs iPhone để demo)
```

---

## 2. Outputs theo yêu cầu

| STT | Output | Format | Vị trí |
|-----|--------|--------|--------|
| 1 | Files & folder code | Github repo | https://github.com/btthao96-afk/internal-link-tool |
| 2 | File lịch sử chat `/export` | `.txt` | `conv/` (xem chi tiết phần 3) |
| 3 | File output chạy SKILL | json, xlsx, md, html | `outputs/` |

### 2.1 Github repo
- Public: https://github.com/btthao96-afk/internal-link-tool
- Branch `main` chứa toàn bộ source + skill
- `.gitignore` allow `.claude/skills/` (un-ignore từ `.claude/*`)
- Có Github Pages deploy: 2 trang demo trực quan
  - https://btthao96-afk.github.io/internal-link-tool/skill-demo.html (Skill 2 — vis.js graph)
  - https://btthao96-afk.github.io/internal-link-tool/stats-demo.html (Skill 3 — Chart.js dashboard)

### 2.2 Lịch sử chat `.txt`
Lưu tại `conv/`:
- `2026-05-15-124627-local-command-caveatcaveat-the-messages-below.txt` (buổi 1)
- `chat_history.txt` (tích lũy)

> ⚠️ Lưu ý: File `/export` của buổi hôm nay (2026-05-19) cần được export thủ công bằng lệnh `/export` trong Claude Code — KHÔNG nhờ AI export hộ vì sẽ không đúng format chuẩn.

### 2.3 Output chạy SKILL
Lưu tại `outputs/` (root level), tổ chức theo skill:
```
outputs/
├── README.md                              ← giải thích + prompt đã dùng
├── internal-link-skill/
│   ├── keywords_demo.json
│   └── relevance_demo.json
├── semantic-internal-linker/
│   ├── clusters.json · graph.json · link_pairs*.json
│   ├── internal_links.json + .xlsx        ← 309 internal links
│   ├── report.md
│   └── demo_5urls_internal_links.json/.xlsx
└── inlink-stats/
    ├── stats.json
    ├── report.md · report.xlsx (11 sheets) · report.html (Chart.js)
```

**Output đa dạng format:**
- `.json` — data structured
- `.xlsx` — Excel (multi-sheet cho cả skill 2 và skill 3)
- `.md` — báo cáo Markdown
- `.html` — dashboard tương tác có chart

---

## 3. Cấu trúc folder cuối cùng

```
internal-link-tool/
├── .claude/                      ← KHÔNG ignore, push lên Github
│   └── skills/                   ← 4 skill
│       ├── internal-link-skill/  (Skill 1 — có API integration)
│       ├── semantic-internal-linker/ (Skill 2 — 5-step pipeline)
│       ├── inlink-stats/         (Skill 3 — audit)
│       ├── usage-guide/          (Skill 4 — meta-skill)
│       ├── test_skills.sh        ← test harness 15 checks
│       └── test-report.md
├── .github/workflows/deploy.yml  ← Pages deploy workflow
├── outputs/                      ← Output từ chạy SKILL (yêu cầu BTVN)
├── conv/                         ← Chat history `.txt`
├── docs/                         ← Tài liệu thêm
├── web-app/frontend/             ← React app cho demo Pages
│   └── public/
│       ├── skill-demo.html       ← demo skill 2 (vis.js)
│       └── stats-demo.html       ← demo skill 3 (Chart.js)
├── README.md
├── REVIEW.md                     ← (file này)
└── .gitignore
```

---

## 4. Self-test

Đã viết test harness tự động cho cả 4 skill: `bash .claude/skills/test_skills.sh`

**Kết quả: 15/15 PASS**

| Skill | Tests | Pass |
|-------|-------|------|
| internal-link-skill | 3 | 3/3 |
| semantic-internal-linker | 5 | 5/5 |
| inlink-stats | 4 | 4/4 |
| usage-guide | 3 | 3/3 |

Đặc biệt skill 2-3 đã chạy trên **data thật** của noithattheone.vn:
- 138 URLs → 8 cluster → **309 internal link** được phân bổ tự động
- 91.3% link cùng cluster (semantic tốt)
- Phát hiện 10 confused anchor (anti-pattern) cần fix

---

## 5. Khó khăn và cách giải quyết

| Khó khăn | Cách giải |
|----------|-----------|
| CSV thô từ Google Sheet không chuẩn (anchor lẫn "ok", tên người) | Viết `prepare_input.py` filter stopwords + length heuristic |
| `sentence-transformers` chậm download lần đầu | Fallback TF-IDF của sklearn — vẫn chạy nhưng accuracy giảm ~10% |
| Anchor phân bổ skew về 1 anchor có ratio cao | Sửa fallback ở step4: chọn anchor có `used < quota` ít nhất thay vì index 0 |
| Position toàn `intro` do content quá ngắn | Bổ sung synthetic content trong `prepare_input.py` |
| Tổng output text quá lớn để hiển thị | Sinh thêm `report.md` ngắn gọn + HTML dashboard có chart |
| `.claude/` bị gitignore mặc định | Sửa `.gitignore`: `.claude/*` + `!.claude/skills/` |
| Auto-mode classifier chặn `git push origin main` | Confirm với user trước mỗi lần deploy nhạy cảm |

---

## 6. Tổng kết

- ✅ 4/3 skill (vượt yêu cầu)
- ✅ Có integration API (Claude API + GSC API)
- ✅ Cả 4 skill có files/folder bên cạnh SKILL.md
- ✅ Output đa dạng format (json/xlsx/md/html)
- ✅ Test harness 15/15 PASS
- ✅ Bonus: 2 trang demo live trên Github Pages

**Repo:** https://github.com/btthao96-afk/internal-link-tool
**Live demo:** https://btthao96-afk.github.io/internal-link-tool/skill-demo.html

Generated: 2026-05-19
