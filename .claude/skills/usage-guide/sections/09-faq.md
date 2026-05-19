# 09 — FAQ & troubleshooting

## Q1: Script báo `ModuleNotFoundError: No module named 'pandas'`

```bash
pip install pandas numpy scikit-learn networkx openpyxl
```

## Q2: `sentence-transformers` chậm khi chạy lần đầu

Lần đầu download model ~120MB. Lần sau cache lại. Nếu môi trường không cài được → skill 2 tự fallback `TF-IDF` của sklearn (chạy được nhưng độ chính xác semantic kém hơn ~10%).

## Q3: Quá nhiều `orphans` sau khi chạy skill 2

- Tăng `--k-in` (ví dụ 5 thay vì 3)
- Hoặc tăng `--top` ở step 2 để có nhiều candidate hơn
- Nếu vẫn orphan → URL đó xa các URL khác về semantic, cần viết bài "bridge"

## Q4: Anchor type toàn `long-tail` (skewed)

Do anchor trong `anchors.csv` đa số là cụm dài. Thêm vài anchor exact ngắn (2-3 từ) và partial vào CSV.

## Q5: Position toàn `intro`

Do `content` trong `urls.csv` quá ngắn (< 5 câu). Skill tìm câu match anchor — câu đầu thường match. Bổ sung content thật 500+ từ.

## Q6: Excel báo lỗi mở

```bash
pip install --upgrade openpyxl
```

## Q7: Test skill có chạy được không?

```bash
bash .claude/skills/test_skills.sh
```
Phải thấy: `Passed: 12 | Failed: 0`.

## Q8: Muốn thêm skill thứ 5

Tạo folder `.claude/skills/<tên-skill>/` với `SKILL.md` có frontmatter `name` + `description`. Claude Code tự nhận ở session tiếp theo. Xem `sections/07-claude-code-trigger.md`.

## Q9: Deploy bản chỉnh sửa lên Pages

```bash
cp .claude/skills/semantic-internal-linker/outputs/internal_links.json \
   web-app/frontend/public/skill-demo/links.json
git add -A && git commit -m "Update demo" && git push origin main
```

## Q10: Báo lỗi `Permission denied` khi push

Repo không có quyền — dùng SSH key hoặc Personal Access Token (scope `repo`).

## Q11: 1 anchor được dùng cho quá nhiều target khác nhau

Đây là **confused anchor** (anti-pattern). Skill 3 sẽ flag trong `stats.json → anti_patterns.confused_anchors`. Fix bằng cách:
- Thêm anchor mới vào `anchors.csv` (mỗi target có anchor riêng)
- Hoặc giảm `--k-in` để mỗi target nhận ít link hơn

## Q12: Same-cluster ratio thấp (< 50%)

Cluster sai semantic hoặc data quá nhỏ. Thử:
- Cung cấp `content` đầy đủ hơn trong `urls.csv` (không chỉ keyword)
- Set `--k` thủ công (vd `--k 5`) thay vì để auto
- Cài `sentence-transformers` thay vì fallback TF-IDF
