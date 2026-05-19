# Skill Test Report

**Date:** 2026-05-19 11:42:43
**Passed:** 15
**Failed:** 0

## Results

| Status | Test | Detail |
|--------|------|--------|
| PASS | internal-link-skill::SKILL.md | frontmatter OK |
| PASS | internal-link-skill::extract_keywords | trích xuất 5 keyword |
| PASS | internal-link-skill::relevance_score | top match = https://x.com/internal-link (n=3) |
| PASS | semantic-internal-linker::SKILL.md | frontmatter OK |
| PASS | semantic-internal-linker::pipeline (templates) | 10 links sinh ra |
| PASS | semantic-internal-linker::real data run | 309 links từ 8 cluster (138 URLs noithattheone) |
| PASS | semantic-internal-linker::output schema | đủ các field source/target/anchor/anchor_type/position/score |
| PASS | semantic-internal-linker::rules (no self-link, no dup) | tuân thủ rule |
| PASS | inlink-stats::SKILL.md | frontmatter OK |
| PASS | inlink-stats::analyze (all formats) | stats.json + report.md + .xlsx + .html |
| PASS | inlink-stats::detect anti-patterns | phát hiện confused anchors + generic anchor |
| PASS | inlink-stats::real data | 309 links analyzed, 11 orphans |
| PASS | usage-guide::SKILL.md | frontmatter OK |
| PASS | usage-guide::all 12 content files present | 9 sections + 1 cheatsheet + 2 examples |
| PASS | usage-guide::sample CSV runnable | examples chạy được trong semantic-linker pipeline |
