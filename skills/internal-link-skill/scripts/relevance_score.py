"""
Tính điểm relevance giữa bài viết nguồn và các bài viết đích.

Usage:
    python relevance_score.py <source.txt> <pages.json>

Trong đó pages.json có format:
[
  {"url": "https://...", "title": "...", "content": "..."},
  ...
]
"""
import argparse
import json
import math
import re
from collections import Counter
from pathlib import Path


def tokenize(text: str) -> list[str]:
    text = text.lower()
    text = re.sub(r"[^\w\sÀ-ỹ]", " ", text)
    return [t for t in text.split() if len(t) > 1]


def cosine_similarity(a: Counter, b: Counter) -> float:
    common = set(a) & set(b)
    dot = sum(a[t] * b[t] for t in common)
    norm_a = math.sqrt(sum(v * v for v in a.values()))
    norm_b = math.sqrt(sum(v * v for v in b.values()))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


def score_pages(source_text: str, pages: list[dict]) -> list[dict]:
    source_vec = Counter(tokenize(source_text))
    results = []
    for page in pages:
        target_vec = Counter(tokenize(page.get("content", "")))
        sim = cosine_similarity(source_vec, target_vec)
        results.append(
            {
                "url": page.get("url"),
                "title": page.get("title"),
                "relevance_score": round(sim * 100, 2),
                "matched_keywords": sorted(
                    set(source_vec) & set(target_vec),
                    key=lambda k: -(source_vec[k] + target_vec[k]),
                )[:10],
            }
        )
    results.sort(key=lambda r: r["relevance_score"], reverse=True)
    return results


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("pages", type=Path)
    parser.add_argument("--min-score", type=float, default=60.0)
    args = parser.parse_args()

    source_text = args.source.read_text(encoding="utf-8")
    pages = json.loads(args.pages.read_text(encoding="utf-8"))
    scored = score_pages(source_text, pages)
    filtered = [r for r in scored if r["relevance_score"] >= args.min_score]
    print(json.dumps(filtered, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
