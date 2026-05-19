"""
Export stats.json sang Excel multi-sheet.

Sheets:
  - overview
  - per_url
  - anchor_type
  - top_anchors
  - cluster
  - orphans + weak
  - anti_patterns

Usage:
    python export_excel.py --stats outputs/stats.json --out outputs/report.xlsx
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import pandas as pd


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--stats", required=True, type=Path)
    ap.add_argument("--out", required=True, type=Path)
    args = ap.parse_args()

    stats = json.loads(args.stats.read_text(encoding="utf-8"))
    args.out.parent.mkdir(parents=True, exist_ok=True)

    with pd.ExcelWriter(args.out, engine="openpyxl") as w:
        pd.DataFrame([{"metric": k, "value": v} for k, v in stats["overview"].items()]).to_excel(w, sheet_name="overview", index=False)
        pd.DataFrame(stats["per_url"]).to_excel(w, sheet_name="per_url", index=False)
        pd.DataFrame([{"type": k, "count": v} for k, v in stats["anchor_type_distribution"].items()]).to_excel(w, sheet_name="anchor_type", index=False)
        pd.DataFrame(stats["top_anchors"], columns=["anchor", "count"]).to_excel(w, sheet_name="top_anchors", index=False)
        pd.DataFrame([{"cluster": k, "count": v} for k, v in stats["cluster_distribution"].items()]).to_excel(w, sheet_name="cluster", index=False)
        pd.DataFrame({"orphans": stats["orphans"]}).to_excel(w, sheet_name="orphans", index=False)
        pd.DataFrame({"weak_pages": stats["weak_pages"]}).to_excel(w, sheet_name="weak_pages", index=False)
        pd.DataFrame(stats["authority_pages"]).to_excel(w, sheet_name="authority", index=False)
        ap_data = stats["anti_patterns"]
        pd.DataFrame(ap_data["over_optimization_targets"]).to_excel(w, sheet_name="over_opt", index=False)
        pd.DataFrame(ap_data["confused_anchors"]).to_excel(w, sheet_name="confused_anchors", index=False)
        pd.DataFrame({"chain": [" → ".join(c) for c in ap_data["long_chains"]]}).to_excel(w, sheet_name="long_chains", index=False)

    print(f"OK: Excel → {args.out}")


if __name__ == "__main__":
    main()
