"""
So sánh 2 build stats.json — sinh báo cáo diff Markdown.

Usage:
    python compare.py --before old/stats.json --after new/stats.json --out diff.md
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path


def diff_overview(b: dict, a: dict) -> list[str]:
    md = ["## Overview diff\n", "| Metric | Before | After | Δ |", "|---|---|---|---|"]
    for k in a:
        bv = b.get(k, 0)
        av = a.get(k, 0)
        try:
            d = round(av - bv, 4)
            arrow = "↑" if d > 0 else ("↓" if d < 0 else "·")
            md.append(f"| {k} | {bv} | {av} | {arrow} {d} |")
        except TypeError:
            md.append(f"| {k} | {bv} | {av} | — |")
    return md


def diff_set(name: str, b: list, a: list) -> list[str]:
    bs, as_ = set(b), set(a)
    added = sorted(as_ - bs)
    removed = sorted(bs - as_)
    md = [f"\n## {name} diff\n", f"- ➕ Added: **{len(added)}**", f"- ➖ Removed: **{len(removed)}**"]
    if added:
        md.append("\n### Added")
        for x in added[:10]:
            md.append(f"- {x}")
    if removed:
        md.append("\n### Removed")
        for x in removed[:10]:
            md.append(f"- {x}")
    return md


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--before", required=True, type=Path)
    ap.add_argument("--after", required=True, type=Path)
    ap.add_argument("--out", required=True, type=Path)
    args = ap.parse_args()

    b = json.loads(args.before.read_text(encoding="utf-8"))
    a = json.loads(args.after.read_text(encoding="utf-8"))

    md = [
        "# Inlink Stats — Diff Report",
        f"\n**Before:** {b.get('generated_at')}",
        f"**After:** {a.get('generated_at')}\n",
    ]
    md += diff_overview(b["overview"], a["overview"])
    md += diff_set("Orphans", b["orphans"], a["orphans"])
    md += diff_set("Weak pages", b["weak_pages"], a["weak_pages"])

    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text("\n".join(md), encoding="utf-8")
    print(f"OK: diff → {args.out}")


if __name__ == "__main__":
    main()
