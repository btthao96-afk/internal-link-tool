"""
Bước 2 — Semantic Graph.

Tạo graph có hướng giữa các URL.
- Edge weight = cosine similarity giữa 2 embedding
- Node có: pagerank, semantic_score, cluster_id

Usage:
    python step2_semantic_graph.py --clusters clusters.json --out graph.json [--top 8]
    --top: số neighbor mỗi node (k-nearest)
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np


def cosine(a: np.ndarray, b: np.ndarray) -> float:
    denom = (np.linalg.norm(a) * np.linalg.norm(b)) or 1e-9
    return float(np.dot(a, b) / denom)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--clusters", required=True, type=Path)
    ap.add_argument("--out", required=True, type=Path)
    ap.add_argument("--top", type=int, default=8)
    args = ap.parse_args()

    data = json.loads(args.clusters.read_text(encoding="utf-8"))
    items = data["clusters"]
    n = len(items)
    embeddings = np.array([it["embedding"] for it in items])

    import networkx as nx

    g = nx.DiGraph()
    for i, it in enumerate(items):
        g.add_node(
            i,
            url=it["url"],
            title=it["title"],
            main_keyword=it["main_keyword"],
            cluster_id=it["cluster_id"],
            cluster_label=it["cluster_label"],
        )

    sim = embeddings @ embeddings.T
    np.fill_diagonal(sim, -1.0)

    for i in range(n):
        order = np.argsort(-sim[i])
        for j in order[: args.top]:
            score = float(sim[i, j])
            if score <= 0:
                continue
            same_topic = items[i]["cluster_id"] == items[j]["cluster_id"]
            g.add_edge(i, int(j), weight=score, same_cluster=bool(same_topic))

    pagerank = nx.pagerank(g, weight="weight")

    nodes = []
    for i in range(n):
        out_edges = sorted(
            [(int(v), float(d["weight"]), bool(d["same_cluster"])) for _, v, d in g.out_edges(i, data=True)],
            key=lambda x: -x[1],
        )
        nodes.append(
            {
                "id": i,
                "url": items[i]["url"],
                "title": items[i]["title"],
                "main_keyword": items[i]["main_keyword"],
                "cluster_id": items[i]["cluster_id"],
                "cluster_label": items[i]["cluster_label"],
                "pagerank": round(pagerank[i], 6),
                "semantic_score": round(float(sim[i].max()), 4),
                "candidates": [
                    {"target_id": v, "weight": round(w, 4), "same_cluster": s}
                    for v, w, s in out_edges
                ],
            }
        )

    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps({"nodes": nodes}, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"OK: graph với {n} nodes, top-{args.top} neighbors → {args.out}")


if __name__ == "__main__":
    main()
