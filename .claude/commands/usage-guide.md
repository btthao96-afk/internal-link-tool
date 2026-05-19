---
description: Hỏi cách dùng các skill internal link — đọc hướng dẫn chi tiết, command cheatsheet, FAQ
argument-hint: <câu hỏi hoặc tên skill muốn xem hướng dẫn>
---

Bạn vừa nhận lệnh `/usage-guide`. Câu hỏi của user:

$ARGUMENTS

Hãy thực hiện theo skill `usage-guide` tại `.claude/skills/usage-guide/SKILL.md`.

Các bước cần làm:

1. **Đọc** `.claude/skills/usage-guide/SKILL.md` để biết cấu trúc tài liệu
2. **Phân loại câu hỏi**:
   - Tổng quan → đọc `sections/01-architecture.md`
   - Cài đặt → `sections/02-install.md`
   - Hướng dẫn 1 skill cụ thể → `sections/03-*.md`, `04-*.md`, `05-*.md`
   - Quy trình end-to-end → `sections/06-workflow-end-to-end.md`
   - Cách Claude auto-gọi skill → `sections/07-claude-code-trigger.md`
   - URLs demo → `sections/08-demo-urls.md`
   - Báo lỗi / câu hỏi thường gặp → `sections/09-faq.md`
   - Tra command nhanh → `references/command-cheatsheet.md`
3. **Trả lời ngắn gọn trước**, sau đó trỏ tới section chi tiết nếu user cần thêm
4. **Luôn kèm command cụ thể copy-paste được** — không chỉ mô tả lý thuyết
5. Nếu user hỏi về 1 skill cụ thể, **gợi ý dùng slash command** `/internal-link-skill`, `/semantic-internal-linker`, `/inlink-stats` để chạy luôn

Lưu ý: skill này không sinh file output — chỉ trả lời text trong chat.
