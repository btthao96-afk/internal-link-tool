# 07 — Cách Claude Code tự gọi skill

Cả 4 skill có frontmatter trong `SKILL.md` nên Claude Code **tự nhận diện và gọi đúng skill** khi user mô tả việc cần làm.

## Bảng mapping prompt → skill

| Prompt user (tiếng Việt) | Skill được trigger |
|--------------------------|---------------------|
| "Trích xuất keyword từ bài này" | `internal-link-skill` |
| "Tìm các trang liên quan để link tới" | `internal-link-skill` |
| "Gợi ý anchor text bằng AI" | `internal-link-skill` |
| "Build internal link cho 100 URLs này" | `semantic-internal-linker` |
| "Tạo semantic graph của các bài viết" | `semantic-internal-linker` |
| "Phân bổ anchor theo ratio" | `semantic-internal-linker` |
| "Audit internal link của site" | `inlink-stats` |
| "Trang nào đang orphan?" | `inlink-stats` |
| "So sánh build A và build B" | `inlink-stats` |
| "Cách dùng skill X" | `usage-guide` |
| "Hướng dẫn / docs / tài liệu" | `usage-guide` |

## Quy trình thực tế

1. `cd internal-link-tool && claude` — mở Claude Code trong thư mục repo
2. Gõ yêu cầu bằng tiếng Việt tự nhiên
3. Claude đọc các `SKILL.md`, match description với prompt, gọi đúng skill
4. Skill được kích hoạt sẽ:
   - Đọc instructions trong `SKILL.md`
   - Chạy scripts trong `scripts/`
   - Tham khảo `references/` khi cần
   - Trả về kết quả + path tới output

## Cách thêm skill mới

Tạo folder `.claude/skills/<tên-skill>/` với:
1. `SKILL.md` có frontmatter:
   ```yaml
   ---
   name: tên-skill
   description: Mô tả ngắn (1-3 câu) cho biết KHI NÀO dùng skill này. Càng cụ thể về trigger phrases, Claude càng dễ gọi đúng.
   ---
   ```
2. (tuỳ chọn) `scripts/`, `references/`, `templates/`, `examples/`

Claude Code sẽ tự nhận skill mới ở session tiếp theo.

## Debug khi Claude không gọi skill

- Kiểm tra frontmatter `description` có chứa keyword user dùng không
- Thêm các trigger phrase phổ biến vào description (vd: "khi user nói 'X', 'Y', 'Z' thì dùng skill này")
- Test bằng `bash .claude/skills/test_skills.sh` để chắc skill chạy được
