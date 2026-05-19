# 08 — Demo URLs

Bộ skill có 3 trang demo live trên GitHub Pages (cập nhật tự động khi push lên `main`):

| Trang | URL | Mô tả |
|-------|-----|-------|
| Semantic Linker | https://btthao96-afk.github.io/internal-link-tool/skill-demo.html | Demo skill 2 — 5 URLs iPhone, graph tương tác (vis.js), bảng 10 links |
| Inlink Stats | https://btthao96-afk.github.io/internal-link-tool/stats-demo.html | Demo skill 3 — KPI bar, doughnut + bar chart, 6 anti-pattern indicators |
| GitHub repo | https://github.com/btthao96-afk/internal-link-tool | Source code 3 skills |

## Cập nhật data demo

Khi muốn refresh data demo trên Pages:

```bash
# 1. Chạy skill local với input mới
cd .claude/skills/semantic-internal-linker
python scripts/run_pipeline.py --urls inputs/urls.csv --anchors inputs/anchors.csv --out outputs/

# 2. Copy output sang public folder của web app
cp outputs/internal_links.json ../../web-app/frontend/public/skill-demo/links.json
cp outputs/clusters.json ../../web-app/frontend/public/skill-demo/clusters.json

# 3. Chạy skill 3 + copy stats
cd ../inlink-stats
python scripts/analyze.py --input ../semantic-internal-linker/outputs/internal_links.json --out outputs/
cp outputs/stats.json ../../web-app/frontend/public/skill-demo/stats.json

# 4. Commit + push
cd ../../..
git add web-app/frontend/public/skill-demo/
git commit -m "Update demo data"
git push origin main
```

GitHub Actions workflow `.github/workflows/deploy.yml` tự build React app và deploy lên Pages (~2-3 phút).

## Deploy local (không push)

```bash
cd web-app/frontend
npm install
npm run build
# Mở build/skill-demo.html trong browser
```

## Note

- Pages **chỉ host static files** — không chạy được Python script trực tiếp
- Trang demo embed sẵn output JSON đã chạy local, render bằng JS (vis.js, Chart.js)
- Muốn site thực sự tương tác (chạy skill từ form web) cần dựng backend riêng — không nằm trong scope của BTVN
