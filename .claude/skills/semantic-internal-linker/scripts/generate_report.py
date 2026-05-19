"""
Sinh báo cáo Markdown từ output pipeline để dễ review.

Usage:
    python generate_report.py --links outputs/internal_links.json --out outputs/report.md
"""
from __future__ import annotations

import argparse
import json
from collections import Counter
from datetime import datetime
from pathlib import Path


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--links", required=True, type=Path)
    ap.add_argument("--out", required=True, type=Path)
    args = ap.parse_args()

    links = json.loads(args.links.read_text(encoding="utf-8"))
    total = len(links)
    pos = Counter(d["position"] for d in links)
    atype = Counter(d["anchor_type"] for d in links)
    anchors = Counter(d["anchor"] for d in links)
    clusters = Counter(d["cluster"] for d in links)
    same_cluster = sum(1 for d in links if d.get("same_cluster"))

    md = []
    md.append("# Internal Link Build Report")
    md.append(f"\n**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    md.append(f"\n**Total links:** {total}")
    md.append(f"\n**Same-cluster ratio:** {same_cluster}/{total} = {same_cluster*100/total:.1f}%\n")

    md.append("## Position distribution\n")
    md.append("| Position | Count | % |")
    md.append("|----------|-------|---|")
    for p, c in pos.most_common():
        md.append(f"| {p} | {c} | {c*100/total:.1f}% |")

    md.append("\n## Anchor type distribution\n")
    md.append("| Type | Count | % |")
    md.append("|------|-------|---|")
    for t, c in atype.most_common():
        md.append(f"| {t} | {c} | {c*100/total:.1f}% |")

    md.append("\n## Top 10 anchor usage\n")
    md.append("| Anchor | Used |")
    md.append("|--------|------|")
    for a, c in anchors.most_common(10):
        md.append(f"| {a} | {c} |")

    md.append("\n## Top 10 clusters\n")
    md.append("| Cluster | Count |")
    md.append("|---------|-------|")
    for cl, c in clusters.most_common(10):
        md.append(f"| {cl} | {c} |")

    md.append("\n## Sample links (first 15)\n")
    md.append("| # | Source | Target | Anchor | Type | Position |")
    md.append("|---|--------|--------|--------|------|----------|")
    for i, d in enumerate(links[:15], 1):
        s = d["source"].split("/")[-1][:35]
        t = d["target"].split("/")[-1][:35]
        md.append(f"| {i} | {s} | {t} | {d['anchor']} | {d['anchor_type']} | {d['position']} |")

    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text("\n".join(md), encoding="utf-8")
    print(f"OK: report → {args.out}")


if __name__ == "__main__":
    main()
