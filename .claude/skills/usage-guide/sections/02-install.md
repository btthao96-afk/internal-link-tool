# 02 — Cài đặt

## Yêu cầu
- Python 3.10+
- (tuỳ chọn) Node 18+ nếu chạy dashboard local

## Bước 1: Clone repo
```bash
git clone https://github.com/btthao96-afk/internal-link-tool.git
cd internal-link-tool
```

## Bước 2: Cài Python dependencies

**Tối thiểu** (đủ chạy cả 3 skill):
```bash
pip install pandas numpy scikit-learn networkx openpyxl
```

**Đầy đủ** (kèm semantic embedding tốt nhất):
```bash
pip install -r .claude/skills/semantic-internal-linker/requirements.txt
```

> Nếu không cài được `sentence-transformers`, skill 2 sẽ **tự fallback sang TF-IDF** (sklearn) — vẫn chạy nhưng độ chính xác ngữ nghĩa kém hơn ~10%.

## Bước 3 (tuỳ chọn): Cài deps cho integration

```bash
# Claude API (skill 1 — gợi ý anchor tự nhiên)
pip install anthropic
export ANTHROPIC_API_KEY="sk-ant-..."

# Google Search Console (skill 1 — lấy keyword ranking)
pip install google-api-python-client google-auth
export GSC_CREDENTIALS_JSON=/path/to/service-account.json
```

## Bước 4: Verify

```bash
bash .claude/skills/test_skills.sh
```
Phải thấy: `Passed: 12 | Failed: 0`.

## Troubleshooting cài đặt

| Lỗi | Fix |
|-----|-----|
| `ModuleNotFoundError: pandas` | `pip install pandas` |
| `sentence-transformers` install chậm | Bỏ qua — fallback TF-IDF chạy được |
| `pip` không có | Cài Python 3.10+ chính thức từ python.org |
| Permission denied khi pip | Dùng `pip install --user ...` hoặc venv |
