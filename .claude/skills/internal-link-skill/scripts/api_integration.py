"""
Tích hợp với các API ngoài để làm giàu dữ liệu internal link.

Hỗ trợ:
- Google Search Console (lấy keyword đang ranking)
- OpenAI/Claude API (gợi ý anchor text tự nhiên)

Yêu cầu biến môi trường:
    GSC_CREDENTIALS_JSON   - path tới service account JSON của Google
    ANTHROPIC_API_KEY      - Claude API key (hoặc OPENAI_API_KEY)

Usage:
    python api_integration.py suggest-anchors --target-url <url> --keyword <kw>
    python api_integration.py gsc-keywords --site <domain> --page <url>
"""
import argparse
import json
import os
import sys
from typing import Any


def suggest_anchors_claude(target_url: str, target_keyword: str, n: int = 5) -> list[str]:
    """Dùng Claude API để gợi ý anchor text tự nhiên."""
    try:
        from anthropic import Anthropic
    except ImportError:
        sys.exit("Cần cài: pip install anthropic")

    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        sys.exit("Thiếu ANTHROPIC_API_KEY")

    client = Anthropic(api_key=api_key)
    prompt = (
        f"Đề xuất {n} anchor text tiếng Việt tự nhiên để link tới trang có "
        f"keyword chính là '{target_keyword}' (URL: {target_url}). "
        "Mỗi anchor 3-8 từ, đa dạng (exact, partial, long-tail). "
        "Chỉ trả về JSON array các string, không kèm giải thích."
    )
    resp = client.messages.create(
        model="claude-opus-4-7",
        max_tokens=512,
        messages=[{"role": "user", "content": prompt}],
    )
    text = resp.content[0].text
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return [line.strip("-• ") for line in text.splitlines() if line.strip()]


def fetch_gsc_keywords(site: str, page_url: str) -> list[dict[str, Any]]:
    """Lấy top keyword đang ranking của 1 page từ Google Search Console."""
    try:
        from google.oauth2 import service_account
        from googleapiclient.discovery import build
    except ImportError:
        sys.exit("Cần cài: pip install google-api-python-client google-auth")

    cred_path = os.getenv("GSC_CREDENTIALS_JSON")
    if not cred_path:
        sys.exit("Thiếu GSC_CREDENTIALS_JSON")

    creds = service_account.Credentials.from_service_account_file(
        cred_path,
        scopes=["https://www.googleapis.com/auth/webmasters.readonly"],
    )
    service = build("searchconsole", "v1", credentials=creds)
    body = {
        "startDate": "2026-02-01",
        "endDate": "2026-05-01",
        "dimensions": ["query"],
        "dimensionFilterGroups": [
            {"filters": [{"dimension": "page", "operator": "equals", "expression": page_url}]}
        ],
        "rowLimit": 25,
    }
    resp = service.searchanalytics().query(siteUrl=site, body=body).execute()
    return resp.get("rows", [])


def main() -> None:
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest="cmd", required=True)

    sa = sub.add_parser("suggest-anchors")
    sa.add_argument("--target-url", required=True)
    sa.add_argument("--keyword", required=True)
    sa.add_argument("-n", type=int, default=5)

    gk = sub.add_parser("gsc-keywords")
    gk.add_argument("--site", required=True)
    gk.add_argument("--page", required=True)

    args = parser.parse_args()
    if args.cmd == "suggest-anchors":
        result = suggest_anchors_claude(args.target_url, args.keyword, args.n)
    else:
        result = fetch_gsc_keywords(args.site, args.page)
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
