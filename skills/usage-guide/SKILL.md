---
name: usage-guide
description: Hướng dẫn chi tiết cách dùng bộ 3 skill internal link (internal-link-skill, semantic-internal-linker, inlink-stats). Sử dụng khi user hỏi "cách dùng skill", "hướng dẫn", "làm sao để chạy", "tài liệu", "doc", "skill này dùng để làm gì", "command nào", hoặc cần troubleshoot lỗi. Cung cấp ví dụ command, mô tả input/output, workflow end-to-end, và FAQ.
---

# Usage Guide — 3 Skill Internal Link

Skill này là **tài liệu hướng dẫn** cho bộ 3 skill còn lại trong workspace. Đọc theo nhu cầu:

## Khi nào dùng skill này

Trigger khi user nói:
- "Hướng dẫn cách dùng"
- "Cách chạy skill X"
- "Skill này dùng để làm gì"
- "Command để build internal link"
- "Tài liệu / docs / readme"
- Báo lỗi khi chạy → troubleshoot

## Cách trả lời user

1. **Xác định ý định:**
   - Tổng quan các skill → trả lời từ `sections/01-architecture.md`
   - Hướng dẫn 1 skill cụ thể → đọc `sections/03-*.md`, `04-*.md`, `05-*.md`
   - Quy trình tổng → `sections/06-workflow-end-to-end.md`
   - Lỗi / vấn đề → `sections/09-faq.md`
2. **Trả lời ngắn gọn trước**, sau đó trỏ tới section chi tiết nếu user cần thêm.
3. **Luôn kèm command cụ thể** copy-paste được, không chỉ mô tả lý thuyết.
4. Tham khảo `references/command-cheatsheet.md` khi user cần lookup nhanh.

## Cấu trúc skill

```
.claude/skills/usage-guide/
├── SKILL.md                  ← bạn đang đọc
├── sections/                 ← 9 section nội dung
│   ├── 01-architecture.md    ← kiến trúc + bảng so sánh skill
│   ├── 02-install.md         ← cài đặt
│   ├── 03-skill-internal-link.md
│   ├── 04-skill-semantic-linker.md
│   ├── 05-skill-inlink-stats.md
│   ├── 06-workflow-end-to-end.md  ← kết hợp 3 skill
│   ├── 07-claude-code-trigger.md  ← cách Claude auto-gọi skill
│   ├── 08-demo-urls.md
│   └── 09-faq.md             ← 10 câu hỏi thường gặp
├── examples/                 ← input mẫu copy-paste được
│   ├── urls-sample.csv
│   └── anchors-sample.csv
└── references/
    └── command-cheatsheet.md ← bảng lookup nhanh tất cả command
```

## Quick reference

| User hỏi gì | Đọc section nào |
|-------------|-----------------|
| "Có những skill nào?" | `sections/01-architecture.md` |
| "Cài đặt như nào?" | `sections/02-install.md` |
| "Trích xuất keyword" | `sections/03-skill-internal-link.md` |
| "Build internal link map" | `sections/04-skill-semantic-linker.md` |
| "Audit / thống kê / orphan" | `sections/05-skill-inlink-stats.md` |
| "Quy trình từ A-Z" | `sections/06-workflow-end-to-end.md` |
| "Lỗi pandas / sklearn" | `sections/09-faq.md` |
| "Command nhanh" | `references/command-cheatsheet.md` |

## Liên kết tới các skill khác

- [[internal-link-skill]] — basic, single page analysis
- [[semantic-internal-linker]] — 5-step pipeline cho cả site
- [[inlink-stats]] — audit + anti-pattern detection

Khi tham chiếu skill khác, dùng đường dẫn tương đối: `../<skill-name>/SKILL.md`.
