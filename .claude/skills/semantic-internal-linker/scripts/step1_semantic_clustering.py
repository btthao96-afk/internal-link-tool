"""
Bước 1 — Semantic Clustering.

Phân nhóm URL theo chủ đề, ngữ nghĩa, topical relevance.
Dùng sentence-transformers nếu có, fallback TF-IDF.

Usage:
    python step1_semantic_clustering.py --urls urls.csv --out clusters.json [--k 0]
    --k 0 nghĩa là tự chọn số cluster (sqrt(N/2))
"""
from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

import numpy as np
import pandas as pd


def embed_texts(texts: list[str]) -> np.ndarray:
    """Cố gắng dùng sentence-transformers; fallback TF-IDF nếu chưa cài."""
    try:
        from sentence_transformers import SentenceTransformer

        model = SentenceTransformer("paraphrase-multilingual-MiniLM-L12-v2")
        return np.asarray(model.encode(texts, show_progress_bar=False, normalize_embeddings=True))
    except Exception:
        from sklearn.feature_extraction.text import TfidfVectorizer
        from sklearn.preprocessing import normalize

        vec = TfidfVectorizer(max_features=2048, ngram_range=(1, 2))
        m = vec.fit_transform(texts)
        return normalize(m).toarray()


def auto_k(n: int) -> int:
    return max(2, min(n - 1, int(math.sqrt(n / 2))))


def label_cluster(texts: list[str], indices: list[int]) -> str:
    """Lấy token chung xuất hiện nhiều nhất làm nhãn."""
    from collections import Counter
    import re

    tokens: list[str] = []
    for i in indices:
        tokens.extend(re.findall(r"\w+", texts[i].lower()))
    common = [t for t, _ in Counter(tokens).most_common(20) if len(t) > 2]
    return " / ".join(common[:3]) if common else f"cluster"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--urls", required=True, type=Path)
    ap.add_argument("--out", required=True, type=Path)
    ap.add_argument("--k", type=int, default=0)
    args = ap.parse_args()

    df = pd.read_csv(args.urls)
    df["content"] = df["content"].fillna("")
    df["title"] = df["title"].fillna("")
    df["main_keyword"] = df["main_keyword"].fillna("")
    texts = (df["title"] + ". " + df["main_keyword"] + ". " + df["content"].str.slice(0, 1500)).tolist()

    embeddings = embed_texts(texts)
    n = len(df)
    k = args.k if args.k > 0 else auto_k(n)

    from sklearn.cluster import KMeans

    km = KMeans(n_clusters=k, random_state=42, n_init="auto")
    labels = km.fit_predict(embeddings)

    clusters: dict[int, list[int]] = {}
    for i, lbl in enumerate(labels):
        clusters.setdefault(int(lbl), []).append(i)

    items = []
    for cluster_id, idxs in clusters.items():
        label_text = label_cluster(texts, idxs)
        for i in idxs:
            items.append(
                {
                    "url": df.iloc[i]["url"],
                    "title": df.iloc[i]["title"],
                    "main_keyword": df.iloc[i]["main_keyword"],
                    "cluster_id": cluster_id,
                    "cluster_label": label_text,
                    "embedding": embeddings[i].tolist(),
                }
            )

    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps({"clusters": items, "k": k}, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"OK: {n} URLs → {k} clusters → {args.out}")


if __name__ == "__main__":
    main()
