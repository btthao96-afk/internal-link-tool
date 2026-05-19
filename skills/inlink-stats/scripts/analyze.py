"""
Phân tích thống kê internal link.

Input: JSON list hoặc CSV với các cột (source, target, anchor[, anchor_type, cluster]).
Output: stats.json + report.md (mặc định). Nếu --format all, sinh thêm HTML và Excel.

Usage:
    python analyze.py --input links.json --out outputs/
    python analyze.py --input links.csv  --out outputs/ --format all
"""
from __future__ import annotations

import argparse
import csv
import json
import math
import os
import sys
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path

HERE = Path(__file__).resolve().parent


def load_input(path: Path) -> list[dict]:
    if path.suffix.lower() == ".json":
        data = json.loads(path.read_text(encoding="utf-8"))
        if isinstance(data, dict):
            data = data.get("pairs") or data.get("links") or []
        return data
    if path.suffix.lower() == ".csv":
        return list(csv.DictReader(path.open(encoding="utf-8")))
    sys.exit(f"Unsupported input format: {path.suffix}")


def compute_stats(links: list[dict]) -> dict:
    total = len(links)
    sources = {l["source"] for l in links}
    targets = {l["target"] for l in links}
    urls = sources | targets
    n_urls = len(urls)

    in_degree: Counter[str] = Counter()
    out_degree: Counter[str] = Counter()
    anchor_diversity: dict[str, set[str]] = defaultdict(set)
    cluster_of: dict[str, str] = {}
    anchor_targets: dict[str, set[str]] = defaultdict(set)
    same_cluster_links = 0

    for l in links:
        s, t = l["source"], l["target"]
        out_degree[s] += 1
        in_degree[t] += 1
        anchor = l.get("anchor", "")
        anchor_diversity[t].add(anchor)
        anchor_targets[anchor].add(t)
        if l.get("cluster"):
            cluster_of[t] = l["cluster"]
        if l.get("same_cluster"):
            same_cluster_links += 1

    anchor_type_dist = Counter(l.get("anchor_type", "unknown") for l in links)
    anchor_usage = Counter(l.get("anchor", "") for l in links)
    cluster_dist = Counter(cluster_of.get(u, "n/a") for u in urls)

    orphans = sorted([u for u in urls if in_degree[u] == 0])
    weak = sorted([u for u in urls if 0 < in_degree[u] < 2])
    threshold = sorted(in_degree.values(), reverse=True)[: max(1, n_urls // 10)]
    authority_cut = min(threshold) if threshold else 0
    authority_pages = sorted(
        [(u, in_degree[u]) for u in urls if in_degree[u] >= authority_cut and authority_cut > 0],
        key=lambda x: -x[1],
    )[:10]

    avg_in = total / n_urls if n_urls else 0
    avg_out = total / len(sources) if sources else 0
    density = total / (n_urls * (n_urls - 1)) if n_urls > 1 else 0

    target_anchor_type_counts: dict[str, Counter] = defaultdict(Counter)
    for l in links:
        target_anchor_type_counts[l["target"]][l.get("anchor_type", "unknown")] += 1

    over_opt = []
    for t, c in target_anchor_type_counts.items():
        total_t = sum(c.values())
        exact = c.get("exact", 0)
        if total_t >= 2 and exact / total_t > 0.5:
            over_opt.append({"target": t, "exact_count": exact, "total": total_t, "pct": round(exact / total_t * 100, 1)})

    confused_anchors = [
        {"anchor": a, "targets": sorted(t)} for a, t in anchor_targets.items() if len(t) > 1 and a
    ]
    confused_anchors.sort(key=lambda x: -len(x["targets"]))

    self_links = [l for l in links if l["source"] == l["target"]]
    duplicates = [l for l, c in Counter((l["source"], l["target"]) for l in links).items() if c > 1]

    generic_count = anchor_type_dist.get("generic", 0)
    generic_pct = round(generic_count / total * 100, 1) if total else 0

    long_chains = find_long_chains(links, min_len=4)

    return {
        "generated_at": datetime.now().isoformat(timespec="seconds"),
        "overview": {
            "total_links": total,
            "unique_urls": n_urls,
            "unique_sources": len(sources),
            "unique_targets": len(targets),
            "avg_inbound": round(avg_in, 2),
            "avg_outbound": round(avg_out, 2),
            "density": round(density, 4),
            "same_cluster_pct": round(same_cluster_links / total * 100, 1) if total else 0,
        },
        "anchor_type_distribution": dict(anchor_type_dist.most_common()),
        "top_anchors": anchor_usage.most_common(15),
        "cluster_distribution": dict(cluster_dist.most_common()),
        "per_url": [
            {
                "url": u,
                "inbound": in_degree[u],
                "outbound": out_degree[u],
                "anchor_diversity": len(anchor_diversity[u]),
                "cluster": cluster_of.get(u, "n/a"),
            }
            for u in sorted(urls, key=lambda x: -in_degree[x])
        ],
        "orphans": orphans,
        "weak_pages": weak,
        "authority_pages": [{"url": u, "inbound": c} for u, c in authority_pages],
        "anti_patterns": {
            "over_optimization_targets": over_opt,
            "confused_anchors": confused_anchors[:10],
            "self_links": [{"source": l["source"], "target": l["target"]} for l in self_links],
            "duplicate_pairs": [{"source": s, "target": t} for s, t in duplicates],
            "generic_anchor_pct": generic_pct,
            "long_chains": long_chains[:5],
        },
    }


def find_long_chains(links: list[dict], min_len: int = 4) -> list[list[str]]:
    edges: dict[str, list[str]] = defaultdict(list)
    for l in links:
        edges[l["source"]].append(l["target"])
    chains: list[list[str]] = []
    seen_starts: set[str] = set()

    def dfs(node: str, path: list[str]) -> None:
        if len(path) >= min_len:
            chains.append(path.copy())
            return
        for nxt in edges.get(node, []):
            if nxt in path:
                continue
            path.append(nxt)
            dfs(nxt, path)
            path.pop()

    for start in edges:
        if start in seen_starts:
            continue
        dfs(start, [start])
        seen_starts.add(start)
    chains.sort(key=lambda c: -len(c))
    return chains


def render_markdown(stats: dict) -> str:
    o = stats["overview"]
    ap = stats["anti_patterns"]
    md = []
    md.append("# Internal Link Stats Report")
    md.append(f"\n**Generated:** {stats['generated_at']}\n")
    md.append("## Overview\n")
    md.append("| Metric | Value |\n|---|---|")
    for k, v in o.items():
        md.append(f"| {k.replace('_',' ')} | {v} |")
    md.append("\n## Anchor Type Distribution\n")
    md.append("| Type | Count |\n|---|---|")
    for t, c in stats["anchor_type_distribution"].items():
        md.append(f"| {t} | {c} |")
    md.append("\n## Top 10 Anchors\n")
    md.append("| Anchor | Used |\n|---|---|")
    for a, c in stats["top_anchors"][:10]:
        md.append(f"| {a} | {c} |")
    md.append("\n## Authority Pages (top inbound)\n")
    md.append("| URL | Inbound |\n|---|---|")
    for r in stats["authority_pages"]:
        md.append(f"| {r['url']} | {r['inbound']} |")
    md.append(f"\n## Orphans ({len(stats['orphans'])})\n")
    if stats["orphans"]:
        for u in stats["orphans"][:20]:
            md.append(f"- {u}")
        if len(stats["orphans"]) > 20:
            md.append(f"- ... và {len(stats['orphans']) - 20} URL khác")
    else:
        md.append("✅ Không có orphan")
    md.append(f"\n## Weak Pages (inbound = 1) — {len(stats['weak_pages'])}\n")
    if stats["weak_pages"]:
        for u in stats["weak_pages"][:10]:
            md.append(f"- {u}")
    md.append("\n## Anti-patterns\n")
    md.append(f"- ⚠️ Over-optimization targets: **{len(ap['over_optimization_targets'])}**")
    md.append(f"- ⚠️ Confused anchors (1 anchor → nhiều target): **{len(ap['confused_anchors'])}**")
    md.append(f"- ⚠️ Self-links: **{len(ap['self_links'])}**")
    md.append(f"- ⚠️ Duplicate pairs: **{len(ap['duplicate_pairs'])}**")
    md.append(f"- ⚠️ Generic anchor %: **{ap['generic_anchor_pct']}%** (nên < 20%)")
    md.append(f"- ⚠️ Long chains ≥ 4 hops: **{len(ap['long_chains'])}**")
    if ap["over_optimization_targets"]:
        md.append("\n### Top over-optimization targets")
        md.append("| Target | exact / total | % |\n|---|---|---|")
        for x in ap["over_optimization_targets"][:5]:
            md.append(f"| {x['target']} | {x['exact_count']} / {x['total']} | {x['pct']}% |")
    return "\n".join(md)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", required=True, type=Path)
    ap.add_argument("--out", required=True, type=Path)
    ap.add_argument("--format", choices=["json", "md", "all"], default="md")
    args = ap.parse_args()

    args.out.mkdir(parents=True, exist_ok=True)
    links = load_input(args.input)
    if not links:
        sys.exit("Input rỗng hoặc không đọc được.")
    stats = compute_stats(links)

    (args.out / "stats.json").write_text(json.dumps(stats, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"OK: stats.json ({stats['overview']['total_links']} links) → {args.out / 'stats.json'}")

    if args.format in ("md", "all"):
        (args.out / "report.md").write_text(render_markdown(stats), encoding="utf-8")
        print(f"OK: report.md → {args.out / 'report.md'}")

    if args.format == "all":
        import subprocess
        py = sys.executable
        subprocess.run([py, str(HERE / "export_excel.py"), "--stats", str(args.out / "stats.json"), "--out", str(args.out / "report.xlsx")], check=True)
        subprocess.run([py, str(HERE / "generate_html.py"), "--stats", str(args.out / "stats.json"), "--out", str(args.out / "report.html")], check=True)


if __name__ == "__main__":
    main()
