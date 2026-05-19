"""
Convert raw CSV (output từ Google Sheet inlink plan) → urls.csv + anchors.csv chuẩn.

Raw CSV format (column index):
  0: STT
  1: keyword / anchor text
  2: URL
  7: anchor text khác

Usage:
    python prepare_input.py --raw raw-input.csv --urls-out urls.csv --anchors-out anchors.csv
"""
from __future__ import annotations

import argparse
import csv
from collections import Counter
from pathlib import Path


STOP_VALUES = {
    "ok", "Ok", "Tuấn", "Thảo", "Hà", "Linh", "Mai", "Bài viết", "URL", "Mô hình",
    "Anchor text DM", "Anchor text", "x", "n/a", "na", "done", "Done", "DONE",
}
STOP_LOWER = {s.lower() for s in STOP_VALUES}


def is_valid_anchor(text: str) -> bool:
    t = text.strip()
    if not t:
        return False
    if t.lower() in STOP_LOWER:
        return False
    if t.startswith("http"):
        return False
    if len(t) < 5 and " " not in t:
        return False
    if len(t.split()) < 2 and len(t) < 8:
        return False
    return True


def classify_anchor(anchor: str, all_keywords: set[str]) -> str:
    a_lower = anchor.lower().strip()
    words = a_lower.split()
    if any(kw in a_lower for kw in ["the one", "noithattheone", "nội thất the one"]):
        return "branded"
    if any(kw in a_lower for kw in ["xem", "tại đây", "click", "tìm hiểu", "chi tiết", "đọc thêm"]):
        return "generic"
    if len(words) >= 6:
        return "long-tail"
    if len(words) <= 3:
        return "exact"
    return "partial"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--raw", required=True, type=Path)
    ap.add_argument("--urls-out", required=True, type=Path)
    ap.add_argument("--anchors-out", required=True, type=Path)
    args = ap.parse_args()

    urls_seen: dict[str, dict] = {}
    anchors_counter: Counter[str] = Counter()
    keyword_set: set[str] = set()

    with args.raw.open(encoding="utf-8") as f:
        reader = csv.reader(f)
        for i, row in enumerate(reader):
            if i == 0:
                continue
            row += [""] * max(0, 9 - len(row))
            cells = [c.strip().strip('"').strip() for c in row]

            urls_in_row = [c.rstrip("/ ") for c in cells if c.startswith("http")]
            anchors_in_row = [c for c in cells if is_valid_anchor(c) and not c.startswith("http")]

            keyword = anchors_in_row[0] if anchors_in_row else ""

            for url in urls_in_row:
                if url not in urls_seen:
                    slug = url.split("/")[-1].replace("-", " ").replace(".html", "")
                    urls_seen[url] = {
                        "url": url,
                        "title": keyword or slug,
                        "main_keyword": keyword or slug,
                        "content": "",
                    }
                for a in anchors_in_row:
                    urls_seen[url]["content"] += a + ". "

            for kw in anchors_in_row:
                kw_clean = kw.lower().strip()
                keyword_set.add(kw_clean)
                anchors_counter[kw_clean] += 1

    args.urls_out.parent.mkdir(parents=True, exist_ok=True)
    with args.urls_out.open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["url", "title", "content", "main_keyword"])
        w.writeheader()
        for it in urls_seen.values():
            kw = it["main_keyword"]
            synthetic = (
                f"{it['title']}. "
                f"Bài viết về chủ đề {kw} dành cho người quan tâm. "
                f"Trong bài này chúng ta sẽ tìm hiểu chi tiết về {kw}. "
                f"{it['content']} "
                f"Đây là phần giữa bài viết với nội dung mở rộng về {kw} và các vấn đề liên quan. "
                f"Cùng tham khảo thêm các bài khác để hiểu sâu hơn về {kw}. "
                f"Kết luận: việc nắm rõ {kw} sẽ giúp bạn lựa chọn tốt hơn."
            )
            w.writerow(
                {
                    "url": it["url"],
                    "title": it["title"],
                    "content": synthetic.strip(),
                    "main_keyword": kw,
                }
            )

    top_anchors = anchors_counter.most_common(30)
    total = sum(c for _, c in top_anchors) or 1
    args.anchors_out.parent.mkdir(parents=True, exist_ok=True)
    with args.anchors_out.open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["anchor", "ratio", "type"])
        w.writeheader()
        ratios = []
        for anchor, cnt in top_anchors:
            ratios.append(round(cnt / total * 100, 2))
        diff = round(100 - sum(ratios), 2)
        if ratios:
            ratios[0] = round(ratios[0] + diff, 2)
        for (anchor, _), ratio in zip(top_anchors, ratios):
            w.writerow({"anchor": anchor, "ratio": ratio, "type": classify_anchor(anchor, keyword_set)})

    print(f"OK: {len(urls_seen)} URLs → {args.urls_out}")
    print(f"OK: {len(top_anchors)} anchors → {args.anchors_out}")


if __name__ == "__main__":
    main()
