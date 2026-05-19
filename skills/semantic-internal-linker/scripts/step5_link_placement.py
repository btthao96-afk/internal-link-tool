"""
Bước 5 — Link Placement.

Xác định vị trí chèn link trong bài nguồn (intro / body / outro)
và rút ra đoạn văn (snippet) chứa anchor (hoặc gần nghĩa nhất).

Usage:
    python step5_link_placement.py --pairs link_pairs_with_anchor.json --urls urls.csv \
        --out-json internal_links.json --out-xlsx internal_links.xlsx
"""
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

import pandas as pd


def split_sentences(text: str) -> list[str]:
    text = re.sub(r"\s+", " ", str(text)).strip()
    parts = re.split(r"(?<=[.!?…])\s+|\n+", text)
    return [p for p in parts if p]


def find_best_sentence(content: str, anchor: str, keyword: str) -> tuple[int, str]:
    sents = split_sentences(content)
    if not sents:
        return -1, ""
    anchor_tokens = {t for t in re.findall(r"\w+", anchor.lower()) if len(t) > 2}
    kw_tokens = {t for t in re.findall(r"\w+", keyword.lower()) if len(t) > 2}

    best_idx, best_score = 0, -1
    for i, s in enumerate(sents):
        s_tokens = {t for t in re.findall(r"\w+", s.lower()) if len(t) > 2}
        score = 2 * len(s_tokens & anchor_tokens) + len(s_tokens & kw_tokens)
        if score > best_score:
            best_score, best_idx = score, i
    return best_idx, sents[best_idx]


def position_label(idx: int, total: int) -> str:
    if total <= 1:
        return "body"
    if idx <= total // 3:
        return "intro"
    if idx >= total - max(1, total // 3):
        return "outro"
    return "body"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--pairs", required=True, type=Path)
    ap.add_argument("--urls", required=True, type=Path)
    ap.add_argument("--out-json", required=True, type=Path)
    ap.add_argument("--out-xlsx", required=True, type=Path)
    args = ap.parse_args()

    data = json.loads(args.pairs.read_text(encoding="utf-8"))
    pairs = data["pairs"]

    urls_df = pd.read_csv(args.urls)
    content_by_url = dict(zip(urls_df["url"], urls_df["content"].fillna("")))

    rows = []
    for p in pairs:
        content = content_by_url.get(p["source_url"], "")
        sents = split_sentences(content)
        idx, snippet = find_best_sentence(content, p["anchor"], p["target_keyword"])
        pos = position_label(idx, len(sents))
        rows.append(
            {
                "source": p["source_url"],
                "target": p["target_url"],
                "anchor": p["anchor"],
                "anchor_type": p["anchor_type"],
                "position": pos,
                "snippet": snippet[:300],
                "semantic_score": p["semantic_score"],
                "cluster": p["target_cluster"],
                "same_cluster": p["same_cluster"],
            }
        )

    args.out_json.parent.mkdir(parents=True, exist_ok=True)
    args.out_json.write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")

    df = pd.DataFrame(rows)
    summary = (
        df.groupby("position").size().reset_index(name="count")
        if not df.empty
        else pd.DataFrame()
    )
    anchor_summary = (
        df.groupby(["anchor", "anchor_type"]).size().reset_index(name="count")
        if not df.empty
        else pd.DataFrame()
    )

    args.out_xlsx.parent.mkdir(parents=True, exist_ok=True)
    with pd.ExcelWriter(args.out_xlsx, engine="openpyxl") as writer:
        df.to_excel(writer, sheet_name="internal_links", index=False)
        summary.to_excel(writer, sheet_name="position_summary", index=False)
        anchor_summary.to_excel(writer, sheet_name="anchor_summary", index=False)

    print(f"OK: {len(rows)} internal links → {args.out_json} + {args.out_xlsx}")


if __name__ == "__main__":
    main()
