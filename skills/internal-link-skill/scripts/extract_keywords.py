"""
Trích xuất keyword từ nội dung bài viết tiếng Việt.

Usage:
    python extract_keywords.py <input_file> [--top N]

Output: JSON với danh sách keyword + score
"""
import argparse
import json
import re
from collections import Counter
from pathlib import Path


def load_stopwords(stopwords_path: Path) -> set[str]:
    if not stopwords_path.exists():
        return set()
    return {w.strip().lower() for w in stopwords_path.read_text(encoding="utf-8").splitlines() if w.strip()}


def tokenize(text: str) -> list[str]:
    text = text.lower()
    text = re.sub(r"[^\w\sÀ-ỹ]", " ", text)
    return [t for t in text.split() if len(t) > 1]


def extract_keywords(text: str, stopwords: set[str], top_n: int = 20) -> list[dict]:
    tokens = tokenize(text)
    filtered = [t for t in tokens if t not in stopwords]
    counter = Counter(filtered)
    total = sum(counter.values()) or 1
    return [
        {"keyword": kw, "count": cnt, "frequency": round(cnt / total, 4)}
        for kw, cnt in counter.most_common(top_n)
    ]


def extract_bigrams(text: str, stopwords: set[str], top_n: int = 10) -> list[dict]:
    tokens = tokenize(text)
    bigrams = []
    for i in range(len(tokens) - 1):
        a, b = tokens[i], tokens[i + 1]
        if a in stopwords or b in stopwords:
            continue
        bigrams.append(f"{a} {b}")
    counter = Counter(bigrams)
    return [{"phrase": p, "count": c} for p, c in counter.most_common(top_n)]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("input", type=Path, help="Đường dẫn file văn bản đầu vào")
    parser.add_argument("--top", type=int, default=20)
    parser.add_argument(
        "--stopwords",
        type=Path,
        default=Path(__file__).parent.parent / "references" / "vi-stopwords.txt",
    )
    args = parser.parse_args()

    text = args.input.read_text(encoding="utf-8")
    stopwords = load_stopwords(args.stopwords)

    result = {
        "source": str(args.input),
        "keywords": extract_keywords(text, stopwords, args.top),
        "bigrams": extract_bigrams(text, stopwords, args.top // 2),
    }
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
