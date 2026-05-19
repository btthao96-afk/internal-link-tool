---
description: Build internal link map cho cả site bằng pipeline 5 bước (clustering → graph → allocation → anchor → placement)
argument-hint: <đường dẫn urls.csv & anchors.csv, hoặc mô tả>
---

Bạn vừa nhận lệnh `/semantic-internal-linker`. Yêu cầu của user:

$ARGUMENTS

Hãy thực hiện theo skill `semantic-internal-linker` tại `.claude/skills/semantic-internal-linker/SKILL.md`.

Các bước cần làm:

1. **Đọc** `.claude/skills/semantic-internal-linker/SKILL.md` để hiểu 5-step pipeline
2. **Xác định input** từ yêu cầu user:
   - Có `urls.csv` (cột url, title, content, main_keyword) chưa?
   - Có `anchors.csv` (cột anchor, ratio, type, tổng ratio = 100%) chưa?
   - Nếu user đưa CSV thô từ Google Sheet → chạy `scripts/prepare_input.py --raw <file> --urls-out inputs/urls.csv --anchors-out inputs/anchors.csv` trước
3. **Validate** input:
   - `sum(ratio) ≈ 100` trong anchors.csv
   - urls.csv có ít nhất 5 hàng (skill cần data tối thiểu)
4. **Chạy pipeline** (mặc định full):
   ```bash
   cd .claude/skills/semantic-internal-linker
   python3 scripts/run_pipeline.py --urls inputs/urls.csv --anchors inputs/anchors.csv --out outputs/
   ```
   Hoặc nếu user muốn debug, chạy từng bước 1-5 riêng.
5. **Tinh chỉnh tham số** nếu user yêu cầu:
   - `--k <N>` số cluster (0 = auto)
   - `--k-out <N>` link đi mỗi URL (default 3)
   - `--k-in <N>` link đến mỗi URL (default 3)
6. **Trình bày output**:
   - Path file: `outputs/internal_links.json`, `outputs/internal_links.xlsx`
   - Số liệu: total links, số orphan, same-cluster %
   - Sample 3-5 link đầu để user hiểu format
7. **Sinh report MD bổ sung** nếu user cần: `python3 scripts/generate_report.py --links outputs/internal_links.json --out outputs/report.md`
8. **Đề xuất bước tiếp** — gợi ý chạy `/inlink-stats` để audit chất lượng output

Lưu ý:
- Lần đầu chạy có thể chậm vì `sentence-transformers` download model ~120MB
- Nếu không cài được model, skill tự fallback `TF-IDF` của sklearn
- Output luôn xuất `.json` + `.xlsx` (3 sheets: internal_links / position_summary / anchor_summary)
