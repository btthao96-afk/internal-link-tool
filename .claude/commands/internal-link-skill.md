---
description: Phân tích nhanh 1 bài viết — extract keyword, tìm trang liên quan, gợi ý anchor qua Claude API hoặc lấy keyword GSC
argument-hint: <mô tả việc cần làm hoặc đường dẫn file>
---

Bạn vừa nhận lệnh `/internal-link-skill`. Yêu cầu của user:

$ARGUMENTS

Hãy thực hiện theo skill `internal-link-skill` tại `.claude/skills/internal-link-skill/SKILL.md`.

Các bước cần làm:

1. **Đọc** `.claude/skills/internal-link-skill/SKILL.md` để hiểu instructions
2. **Phân tích** yêu cầu user thuộc loại nào:
   - Trích xuất keyword → dùng `scripts/extract_keywords.py <file>`
   - Tính độ liên quan với list URL → dùng `scripts/relevance_score.py <source> <pages.json>`
   - Gợi ý anchor bằng AI → dùng `scripts/api_integration.py suggest-anchors`
   - Lấy keyword từ Google Search Console → dùng `scripts/api_integration.py gsc-keywords`
3. **Chuẩn bị input** nếu user chưa cung cấp file — hỏi rõ hoặc tạo file mẫu
4. **Chạy script** qua Bash tool
5. **Trình bày kết quả**: in JSON đẹp, giải thích các keyword/relevance score quan trọng, lưu output vào `outputs/internal-link-skill/` nếu user cần
6. **Tham khảo** `references/seo-best-practices.md` khi user hỏi về quy tắc SEO

Nếu user không cung cấp đủ context, hỏi rõ:
- File input ở đâu?
- Cần output keyword hay relevance hay anchor?
- Có cần dùng API ngoài không (cần ENV `ANTHROPIC_API_KEY` hoặc `GSC_CREDENTIALS_JSON`)?
