"""
Bước 3 — Internal Link Allocation.

Phân bổ link theo rule:
- Mỗi URL có K_OUT link đi (default 3)
- Mỗi URL có K_IN link đến (default 3)
- KHÔNG self-link, KHÔNG duplicate (i,j), KHÔNG vòng tròn 2-node (i↔j cùng tồn tại)
- Ưu tiên: same_cluster + semantic score cao + đảm bảo orphan prevention

Usage:
    python step3_link_allocation.py --graph graph.json --out link_pairs.json [--k-out 3 --k-in 3]
"""
from __future__ import annotations

import argparse
import json
from collections import defaultdict
from pathlib import Path


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--graph", required=True, type=Path)
    ap.add_argument("--out", required=True, type=Path)
    ap.add_argument("--k-out", type=int, default=3)
    ap.add_argument("--k-in", type=int, default=3)
    args = ap.parse_args()

    data = json.loads(args.graph.read_text(encoding="utf-8"))
    nodes = data["nodes"]
    n = len(nodes)

    out_count: dict[int, int] = defaultdict(int)
    in_count: dict[int, int] = defaultdict(int)
    selected: set[tuple[int, int]] = set()
    reverse: set[tuple[int, int]] = set()

    candidate_pool = []
    for src in nodes:
        for cand in src["candidates"]:
            candidate_pool.append(
                {
                    "src": src["id"],
                    "tgt": cand["target_id"],
                    "weight": cand["weight"],
                    "same_cluster": cand["same_cluster"],
                }
            )

    candidate_pool.sort(
        key=lambda c: (-int(c["same_cluster"]), -c["weight"])
    )

    for c in candidate_pool:
        s, t = c["src"], c["tgt"]
        if s == t:
            continue
        if (s, t) in selected:
            continue
        if (t, s) in selected:
            continue
        if out_count[s] >= args.k_out:
            continue
        if in_count[t] >= args.k_in:
            continue
        selected.add((s, t))
        reverse.add((t, s))
        out_count[s] += 1
        in_count[t] += 1

    for tgt_id in range(n):
        if in_count[tgt_id] > 0:
            continue
        ranked = sorted(
            ((i, c) for i in range(n) for c in nodes[i]["candidates"] if c["target_id"] == tgt_id),
            key=lambda x: -x[1]["weight"],
        )
        for src_id, c in ranked:
            if src_id == tgt_id:
                continue
            if (src_id, tgt_id) in selected or (tgt_id, src_id) in selected:
                continue
            if out_count[src_id] >= args.k_out + 1:
                continue
            selected.add((src_id, tgt_id))
            out_count[src_id] += 1
            in_count[tgt_id] += 1
            break

    pairs = []
    node_by_id = {n_["id"]: n_ for n_ in nodes}
    for s, t in selected:
        src, tgt = node_by_id[s], node_by_id[t]
        weight = next((c["weight"] for c in src["candidates"] if c["target_id"] == t), 0.0)
        same_cluster = src["cluster_id"] == tgt["cluster_id"]
        pairs.append(
            {
                "source_id": s,
                "target_id": t,
                "source_url": src["url"],
                "target_url": tgt["url"],
                "source_keyword": src["main_keyword"],
                "target_keyword": tgt["main_keyword"],
                "semantic_score": weight,
                "same_cluster": same_cluster,
                "source_cluster": src["cluster_label"],
                "target_cluster": tgt["cluster_label"],
            }
        )

    stats = {
        "total_pairs": len(pairs),
        "orphans": [node_by_id[i]["url"] for i in range(n) if in_count[i] == 0],
        "low_outbound": [node_by_id[i]["url"] for i in range(n) if out_count[i] < args.k_out],
    }

    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(
        json.dumps({"pairs": pairs, "stats": stats}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"OK: {len(pairs)} link pairs (orphans={len(stats['orphans'])}) → {args.out}")


if __name__ == "__main__":
    main()
