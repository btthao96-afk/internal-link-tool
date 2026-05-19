"""
End-to-end pipeline runner cho semantic-internal-linker.

Chạy lần lượt 5 bước và lưu output vào --out folder.

Usage:
    python run_pipeline.py --urls inputs/urls.csv --anchors inputs/anchors.csv --out outputs/
"""
from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent


def run(cmd: list[str]) -> None:
    print(f"\n$ {' '.join(cmd)}")
    res = subprocess.run(cmd, check=False)
    if res.returncode != 0:
        sys.exit(res.returncode)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--urls", required=True, type=Path)
    ap.add_argument("--anchors", required=True, type=Path)
    ap.add_argument("--out", required=True, type=Path)
    ap.add_argument("--k", type=int, default=0, help="số cluster, 0 = auto")
    ap.add_argument("--k-out", type=int, default=3)
    ap.add_argument("--k-in", type=int, default=3)
    args = ap.parse_args()

    args.out.mkdir(parents=True, exist_ok=True)

    clusters = args.out / "clusters.json"
    graph = args.out / "graph.json"
    pairs = args.out / "link_pairs.json"
    pairs_anchor = args.out / "link_pairs_with_anchor.json"
    out_json = args.out / "internal_links.json"
    out_xlsx = args.out / "internal_links.xlsx"

    py = sys.executable

    run([py, str(HERE / "step1_semantic_clustering.py"), "--urls", str(args.urls), "--out", str(clusters), "--k", str(args.k)])
    run([py, str(HERE / "step2_semantic_graph.py"), "--clusters", str(clusters), "--out", str(graph)])
    run([py, str(HERE / "step3_link_allocation.py"), "--graph", str(graph), "--out", str(pairs), "--k-out", str(args.k_out), "--k-in", str(args.k_in)])
    run([py, str(HERE / "step4_anchor_distribution.py"), "--pairs", str(pairs), "--anchors", str(args.anchors), "--out", str(pairs_anchor)])
    run([py, str(HERE / "step5_link_placement.py"), "--pairs", str(pairs_anchor), "--urls", str(args.urls), "--out-json", str(out_json), "--out-xlsx", str(out_xlsx)])

    print(f"\n✅ Pipeline xong. Kết quả tại: {args.out}")


if __name__ == "__main__":
    main()
