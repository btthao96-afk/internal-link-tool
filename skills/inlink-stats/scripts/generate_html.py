"""
Sinh HTML report có Chart.js từ stats.json.

Usage:
    python generate_html.py --stats outputs/stats.json --out outputs/report.html
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

TEMPLATE = """<!doctype html>
<html lang="vi"><head><meta charset="utf-8"><title>Inlink Stats Report</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
         background: #0b1020; color: #e7eaf6; margin: 0; padding: 32px 20px; }
  .container { max-width: 1100px; margin: 0 auto; }
  h1 { font-size: 26px; }
  h2 { color: #6c8cff; margin-top: 28px; }
  .card { background: #11172e; border: 1px solid #1f2746; border-radius: 12px;
          padding: 18px; margin-bottom: 16px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  @media (max-width: 720px) { .grid { grid-template-columns: 1fr; } }
  .kpis { display: flex; gap: 12px; flex-wrap: wrap; }
  .kpi { flex: 1 1 140px; background: #0e1430; border: 1px solid #1f2746;
         border-radius: 10px; padding: 12px; }
  .kpi-num { font-size: 22px; font-weight: 600; color: #6c8cff; }
  .kpi-label { font-size: 11px; color: #97a0c5; text-transform: uppercase; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th, td { padding: 6px 10px; border-bottom: 1px solid #1f2746; text-align: left; }
  th { color: #97a0c5; font-size: 11px; text-transform: uppercase; }
  .bad { color: #ef5b76; } .good { color: #29d3a3; } .warn { color: #f8b94a; }
  code { background: #0e1430; padding: 1px 6px; border-radius: 4px; font-size: 12px; }
</style></head><body><div class="container">
<h1>📊 Internal Link Stats Report</h1>
<div class="card sub">Generated: __TIME__</div>
<div class="kpis">__KPIS__</div>
<div class="grid">
  <div class="card"><h2>Anchor type distribution</h2><canvas id="chart1"></canvas></div>
  <div class="card"><h2>Inbound degree distribution</h2><canvas id="chart2"></canvas></div>
</div>
<div class="card"><h2>Top 10 anchors</h2>__TOP_ANCHORS__</div>
<div class="card"><h2>Authority pages</h2>__AUTHORITY__</div>
<div class="card"><h2 class="warn">Anti-patterns</h2>__ANTI_PATTERNS__</div>
<div class="card"><h2 class="bad">Orphans</h2>__ORPHANS__</div>
</div>
<script>
const stats = __STATS_JSON__;
const c1 = stats.anchor_type_distribution;
new Chart(document.getElementById('chart1'), {
  type: 'doughnut',
  data: { labels: Object.keys(c1), datasets: [{ data: Object.values(c1),
    backgroundColor: ['#c39bff','#7ecbff','#6eecb6','#ffb27e','#97a0c5','#ef5b76'] }] },
  options: { plugins: { legend: { labels: { color: '#e7eaf6' } } } }
});
const inbCounts = stats.per_url.map(r => r.inbound);
const buckets = { '0': 0, '1': 0, '2-3': 0, '4-6': 0, '7-10': 0, '11+': 0 };
inbCounts.forEach(x => {
  if (x === 0) buckets['0']++;
  else if (x === 1) buckets['1']++;
  else if (x <= 3) buckets['2-3']++;
  else if (x <= 6) buckets['4-6']++;
  else if (x <= 10) buckets['7-10']++;
  else buckets['11+']++;
});
new Chart(document.getElementById('chart2'), {
  type: 'bar',
  data: { labels: Object.keys(buckets), datasets: [{ data: Object.values(buckets),
    backgroundColor: '#6c8cff' }] },
  options: { plugins: { legend: { display: false } },
    scales: { x: { ticks: { color: '#e7eaf6' } }, y: { ticks: { color: '#e7eaf6' } } } }
});
</script>
</body></html>
"""


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--stats", required=True, type=Path)
    ap.add_argument("--out", required=True, type=Path)
    args = ap.parse_args()

    stats = json.loads(args.stats.read_text(encoding="utf-8"))
    o = stats["overview"]
    kpis = [
        ("Total links", o["total_links"]),
        ("Unique URLs", o["unique_urls"]),
        ("Avg inbound", o["avg_inbound"]),
        ("Avg outbound", o["avg_outbound"]),
        ("Density", o["density"]),
        ("Same-cluster %", f"{o['same_cluster_pct']}%"),
    ]
    kpi_html = "".join(
        f'<div class="kpi"><div class="kpi-num">{v}</div><div class="kpi-label">{k}</div></div>'
        for k, v in kpis
    )

    rows_anchor = "".join(f"<tr><td><code>{a}</code></td><td>{c}</td></tr>" for a, c in stats["top_anchors"][:10])
    top_anchors_html = f"<table><thead><tr><th>Anchor</th><th>Used</th></tr></thead><tbody>{rows_anchor}</tbody></table>"

    rows_auth = "".join(f"<tr><td><code>{r['url']}</code></td><td>{r['inbound']}</td></tr>" for r in stats["authority_pages"])
    authority_html = f"<table><thead><tr><th>URL</th><th>Inbound</th></tr></thead><tbody>{rows_auth}</tbody></table>"

    ap_data = stats["anti_patterns"]
    ap_rows = [
        f"<li>Over-optimization targets: <b class='bad'>{len(ap_data['over_optimization_targets'])}</b></li>",
        f"<li>Confused anchors: <b class='bad'>{len(ap_data['confused_anchors'])}</b></li>",
        f"<li>Self-links: <b class='bad'>{len(ap_data['self_links'])}</b></li>",
        f"<li>Duplicates: <b class='bad'>{len(ap_data['duplicate_pairs'])}</b></li>",
        f"<li>Generic anchor: <b class='warn'>{ap_data['generic_anchor_pct']}%</b> (nên &lt; 20%)</li>",
        f"<li>Long chains ≥ 4 hops: <b class='warn'>{len(ap_data['long_chains'])}</b></li>",
    ]
    anti_html = f"<ul>{''.join(ap_rows)}</ul>"

    orphans_html = (
        f"<p class='good'>✅ Không có orphan</p>"
        if not stats["orphans"]
        else "<ul>" + "".join(f"<li><code>{u}</code></li>" for u in stats["orphans"][:20]) + "</ul>"
        + (f"<p class='sub'>... và {len(stats['orphans']) - 20} URL khác</p>" if len(stats["orphans"]) > 20 else "")
    )

    html = (
        TEMPLATE
        .replace("__TIME__", stats["generated_at"])
        .replace("__KPIS__", kpi_html)
        .replace("__TOP_ANCHORS__", top_anchors_html)
        .replace("__AUTHORITY__", authority_html)
        .replace("__ANTI_PATTERNS__", anti_html)
        .replace("__ORPHANS__", orphans_html)
        .replace("__STATS_JSON__", json.dumps(stats, ensure_ascii=False))
    )

    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(html, encoding="utf-8")
    print(f"OK: HTML → {args.out}")


if __name__ == "__main__":
    main()
