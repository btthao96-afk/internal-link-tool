"""
Bước 4 — Anchor Distribution.

Phân bổ anchor cho mỗi pair (source, target) theo:
- ratio quota từ anchors.csv
- semantic match: anchor có token trùng main_keyword target được ưu tiên
- anti over-optimization: 1 target không nhận quá ANCHOR_CAP_PER_TYPE % cùng loại exact

Usage:
    python step4_anchor_distribution.py --pairs link_pairs.json --anchors anchors.csv --out link_pairs_with_anchor.json
"""
from __future__ import annotations

import argparse
import json
import re
from collections import defaultdict
from pathlib import Path

import pandas as pd

ANCHOR_CAP_PER_TYPE = 0.5  # 1 target không quá 50% cùng loại exact


def tokens(s: str) -> set[str]:
    return {t for t in re.findall(r"\w+", str(s).lower()) if len(t) > 2}


def overlap(a: str, b: str) -> int:
    return len(tokens(a) & tokens(b))


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--pairs", required=True, type=Path)
    ap.add_argument("--anchors", required=True, type=Path)
    ap.add_argument("--out", required=True, type=Path)
    args = ap.parse_args()

    data = json.loads(args.pairs.read_text(encoding="utf-8"))
    pairs = data["pairs"]
    n_pairs = len(pairs)

    anchors_df = pd.read_csv(args.anchors)
    total_ratio = anchors_df["ratio"].sum()
    if not (99 <= total_ratio <= 101):
        print(f"WARN: tổng ratio = {total_ratio} (nên = 100)")

    anchors_df["quota"] = (anchors_df["ratio"] / total_ratio * n_pairs).round().astype(int)
    diff = n_pairs - anchors_df["quota"].sum()
    if diff != 0:
        idx = anchors_df["ratio"].idxmax()
        anchors_df.at[idx, "quota"] += diff

    anchor_quota = {row["anchor"]: int(row["quota"]) for _, row in anchors_df.iterrows()}
    anchor_type = {row["anchor"]: row["type"] for _, row in anchors_df.iterrows()}
    used_count: dict[str, int] = defaultdict(int)
    type_per_target: dict[tuple[str, str], int] = defaultdict(int)

    pairs_scored = []
    for p in pairs:
        scored_anchors = []
        for anchor in anchor_quota:
            score = overlap(anchor, p["target_keyword"]) + 0.5 * overlap(anchor, p["source_keyword"])
            scored_anchors.append((anchor, score))
        scored_anchors.sort(key=lambda x: -x[1])
        pairs_scored.append({"pair": p, "ranked_anchors": scored_anchors})

    pairs_scored.sort(key=lambda x: -x["ranked_anchors"][0][1])

    output_pairs = []
    for entry in pairs_scored:
        p = entry["pair"]
        chosen = None
        for anchor, score in entry["ranked_anchors"]:
            if used_count[anchor] >= anchor_quota[anchor]:
                continue
            atype = anchor_type[anchor]
            key = (p["target_url"], atype)
            target_inbound = sum(1 for q in output_pairs if q["target_url"] == p["target_url"]) + 1
            if atype == "exact" and (type_per_target[key] + 1) / max(target_inbound, 1) > ANCHOR_CAP_PER_TYPE:
                continue
            chosen = (anchor, atype, score)
            break

        if chosen is None:
            remaining = sorted(
                [(a, used_count[a]) for a in anchor_quota if used_count[a] < anchor_quota[a]],
                key=lambda x: x[1],
            )
            if remaining:
                anchor = remaining[0][0]
            else:
                anchor = min(anchor_quota.keys(), key=lambda a: used_count[a])
            chosen = (anchor, anchor_type[anchor], 0)

        anchor, atype, score = chosen
        used_count[anchor] += 1
        type_per_target[(p["target_url"], atype)] += 1
        p["anchor"] = anchor
        p["anchor_type"] = atype
        p["anchor_semantic_match"] = score
        output_pairs.append(p)

    distribution = {a: {"quota": q, "used": used_count[a]} for a, q in anchor_quota.items()}

    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(
        json.dumps({"pairs": output_pairs, "distribution": distribution}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"OK: {len(output_pairs)} pairs có anchor → {args.out}")


if __name__ == "__main__":
    main()
