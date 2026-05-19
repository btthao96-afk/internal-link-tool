---
description: Audit chất lượng internal link — orphan, anchor diversity, 6 anti-pattern, xuất stats.json + report MD/XLSX/HTML
argument-hint: <đường dẫn file links.json hoặc CSV>
---

Bạn vừa nhận lệnh `/inlink-stats`. Yêu cầu của user:

$ARGUMENTS

Hãy thực hiện theo skill `inlink-stats` tại `.claude/skills/inlink-stats/SKILL.md`.

Các bước cần làm:

1. **Đọc** `.claude/skills/inlink-stats/SKILL.md` để hiểu các metric + anti-pattern
2. **Xác định input**:
   - JSON từ skill 2 (mặc định path: `.claude/skills/semantic-internal-linker/outputs/internal_links.json`)
   - CSV tự nhập (cột source, target, anchor, anchor_type, cluster)
   - Nếu user không chỉ định, hỏi rõ hoặc dùng output skill 2
3. **Chạy phân tích**:
   ```bash
   cd .claude/skills/inlink-stats
   python3 scripts/analyze.py --input <file> --out outputs/ --format all
   ```
   `--format all` sinh đủ JSON + MD + Excel + HTML.
4. **Highlight kết quả quan trọng**:
   - **Overview**: total links, density, same-cluster %
   - **Anti-patterns**: số `over_optimization_targets`, `confused_anchors`, `self_links`, `duplicate_pairs`, `generic_anchor_pct`, `long_chains`
   - **Orphans**: list URL có inbound = 0
   - **Authority pages**: top inbound
5. **Nếu phát hiện anti-pattern**, gợi ý cách fix:
   - Confused anchor → thêm anchor mới vào `anchors.csv` (skill 2)
   - Orphan → tăng `--k-in` khi chạy lại skill 2
   - Generic > 20% → thay bằng anchor có ngữ cảnh
6. **So sánh build** nếu user yêu cầu:
   ```bash
   python3 scripts/compare.py --before old/stats.json --after new/stats.json --out diff.md
   ```
7. **Path output cuối**:
   - `outputs/stats.json` — full data
   - `outputs/report.md` — báo cáo MD
   - `outputs/report.xlsx` — Excel 11 sheets
   - `outputs/report.html` — dashboard Chart.js (gợi ý user mở browser)

Tham khảo `references/anti-patterns.md` để giải thích từng pattern khi user hỏi chi tiết.
