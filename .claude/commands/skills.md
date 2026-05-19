---
description: Liệt kê tất cả skill có trong workspace và slash command tương ứng
---

Hãy trả lời user bằng bảng liệt kê các skill hiện có:

| Slash Command | Skill | Mục đích |
|---------------|-------|----------|
| `/internal-link-skill` | `internal-link-skill` | Phân tích nhanh 1 bài: extract keyword, relevance score, gọi API Claude/GSC |
| `/semantic-internal-linker` | `semantic-internal-linker` | Build internal link map cho cả site bằng pipeline 5 bước |
| `/inlink-stats` | `inlink-stats` | Audit chất lượng internal link, phát hiện 6 anti-pattern |
| `/usage-guide` | `usage-guide` | Hướng dẫn cách dùng các skill, FAQ, command cheatsheet |
| `/skills` | (meta) | Hiển thị danh sách này |

Sau bảng, gợi ý user:
- Gõ `/usage-guide` để xem hướng dẫn chi tiết
- Gõ `/<tên-skill>` rồi mô tả việc cần làm để chạy skill
- Xem code: `.claude/skills/<tên-skill>/`
- Demo live: https://btthao96-afk.github.io/internal-link-tool/skill-demo.html

Đếm số skill bằng `ls .claude/skills/ | wc -l` (loại trừ test files) và confirm có đúng 4 skill.
