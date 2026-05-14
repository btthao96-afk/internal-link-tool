import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';

// ───────────────────────────────────────────────────────────────────────
// URL helpers
// ───────────────────────────────────────────────────────────────────────

const normalizeUrl = (url) => {
  if (!url) return '';
  try {
    return new URL(url.trim().replace(/\s+/g, '')).toString();
  } catch (e) {
    try {
      return new URL('https://' + url.trim().replace(/^https?:\/\//i, '').replace(/\s+/g, '')).toString();
    } catch {
      return '';
    }
  }
};

const humanizeUrl = (url) => {
  try {
    const parsed = new URL(url);
    return parsed.hostname + parsed.pathname.replace(/\/$/, '');
  } catch {
    return url;
  }
};

// Normalize text for VN matching: strip diacritics, lowercase, words only
const removeDiacritics = (s) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');

const normalizeForMatch = (s) =>
  removeDiacritics(String(s || '').toLowerCase())
    .replace(/[-_/?=&#]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

// Extract keywords from URL pathname (legacy fallback)
const extractUrlKeywords = (url) => {
  if (!url) return [];
  try {
    const parsed = new URL(url);
    const parts = [parsed.pathname, parsed.search, parsed.hash]
      .filter(Boolean)
      .join(' ')
      .replace(/[-_?=&#/]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
    return Array.from(new Set(parts.split(' ').filter((w) => w.length > 2 && !['www', 'com', 'html', 'php'].includes(w))));
  } catch {
    return [];
  }
};

// ───────────────────────────────────────────────────────────────────────
// Mapping helpers
// ───────────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'internalLinkMappings_v1';

const parseLines = (raw) =>
  String(raw || '').split('\n').map((s) => s.trim()).filter(Boolean);

const newMappingId = () => `m_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

const emptyMapping = () => ({
  id: newMappingId(),
  keywordsRaw: '',
  targetUrl: '',
  anchorsRaw: '',
});

// Build a "haystack" of normalized text from a URL (for keyword matching)
const buildHaystack = (url) => {
  try {
    const parsed = new URL(url);
    return normalizeForMatch(parsed.pathname + ' ' + parsed.search + ' ' + parsed.hash);
  } catch {
    return normalizeForMatch(url);
  }
};

// Hash a string to a stable integer (for rotating anchors per source URL)
const hashCode = (s) => {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
};

// ───────────────────────────────────────────────────────────────────────
// File import helpers (TXT / CSV / XML sitemap)
// ───────────────────────────────────────────────────────────────────────

const readFileAsText = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(String(e.target.result || ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });

// Robust CSV line parser (handles quoted commas + escaped quotes)
const parseCsvLine = (line) => {
  const out = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i += 1; }
      else inQuotes = !inQuotes;
    } else if (c === ',' && !inQuotes) {
      out.push(cur); cur = '';
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
};

const parseCsv = (text) =>
  text.split(/\r?\n/).filter((l) => l.trim().length > 0).map(parseCsvLine);

// Detect URLs anywhere in a blob of text (TXT / CSV fallback)
const extractAllUrlsFromText = (text) => {
  const matches = text.match(/https?:\/\/[^\s,;"'<>()]+/gi) || [];
  return Array.from(new Set(matches));
};

// Parse sitemap.xml → list of <loc> URLs
const extractUrlsFromSitemap = (xmlText) => {
  try {
    const doc = new DOMParser().parseFromString(xmlText, 'application/xml');
    const locs = doc.getElementsByTagName('loc');
    const urls = [];
    for (let i = 0; i < locs.length; i += 1) {
      const t = (locs[i].textContent || '').trim();
      if (t) urls.push(t);
    }
    return urls;
  } catch {
    return [];
  }
};

// Smart URL extractor — picks strategy by file extension + content
const extractUrlsFromFile = async (file) => {
  const text = await readFileAsText(file);
  const name = (file.name || '').toLowerCase();

  if (name.endsWith('.xml') || text.trimStart().startsWith('<?xml') || text.includes('<urlset') || text.includes('<sitemapindex')) {
    const urls = extractUrlsFromSitemap(text);
    if (urls.length > 0) return urls;
  }

  if (name.endsWith('.csv')) {
    const rows = parseCsv(text);
    const urls = [];
    for (const row of rows) {
      for (const cell of row) {
        if (/^https?:\/\//i.test(cell)) urls.push(cell);
      }
    }
    if (urls.length > 0) return Array.from(new Set(urls));
  }

  // TXT or anything else: one URL per line, then regex fallback
  const byLine = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => /^https?:\/\//i.test(l));
  if (byLine.length > 0) return Array.from(new Set(byLine));

  return extractAllUrlsFromText(text);
};

// Parse mapping CSV: columns = keywords | target_url | anchors
// keywords/anchors cells can use newline or "|" as inner separator
const splitMultiCell = (cell) =>
  String(cell || '').split(/\n|\|/).map((s) => s.trim()).filter(Boolean);

const extractMappingsFromCsv = (text) => {
  const rows = parseCsv(text);
  if (rows.length === 0) return [];

  // Skip header row if it looks like one
  const first = rows[0].map((c) => c.toLowerCase());
  const hasHeader =
    first.some((c) => c.includes('keyword')) ||
    first.some((c) => c.includes('url')) ||
    first.some((c) => c.includes('anchor'));
  const dataRows = hasHeader ? rows.slice(1) : rows;

  return dataRows
    .filter((row) => row.length >= 2)
    .map((row) => ({
      id: `m_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      keywordsRaw: splitMultiCell(row[0]).join('\n'),
      targetUrl: (row[1] || '').trim(),
      anchorsRaw: splitMultiCell(row[2] || '').join('\n'),
    }))
    .filter((m) => m.targetUrl && m.keywordsRaw);
};

// ───────────────────────────────────────────────────────────────────────
// Suggestion engine
// ───────────────────────────────────────────────────────────────────────

const buildSuggestions = (urls, mappings, fallbackPool) => {
  const normalizedUrls = urls
    .map((url) => ({ original: url, url: normalizeUrl(url) }))
    .filter((item) => item.url);

  const validMappings = mappings
    .map((m) => ({
      ...m,
      keywords: parseLines(m.keywordsRaw),
      anchors: parseLines(m.anchorsRaw),
      targetUrl: normalizeUrl(m.targetUrl),
    }))
    .filter((m) => m.targetUrl && m.keywords.length > 0 && m.anchors.length > 0);

  const rows = [];

  for (const source of normalizedUrls) {
    const haystack = buildHaystack(source.url);
    let matchedAny = false;

    // ── Pass 1: mapping-driven suggestions ──
    for (const mapping of validMappings) {
      if (mapping.targetUrl === source.url) continue;

      const matchedKeywords = mapping.keywords.filter((kw) =>
        haystack.includes(normalizeForMatch(kw))
      );
      if (matchedKeywords.length === 0) continue;

      const anchorIdx = hashCode(source.url + mapping.id) % mapping.anchors.length;
      const anchorText = mapping.anchors[anchorIdx];
      const score = Math.min(100, 40 + matchedKeywords.length * 20);

      rows.push({
        id: `map_${source.url}_${mapping.id}`,
        sourceUrl: source.url,
        targetUrl: mapping.targetUrl,
        anchorText,
        score,
        keywords: matchedKeywords,
        source: 'mapping',
        mappingId: mapping.id,
      });
      matchedAny = true;
    }

    // ── Pass 2: legacy fallback (URL ↔ URL similarity) ──
    if (!matchedAny) {
      const sourceKeywords = extractUrlKeywords(source.url);
      for (const target of normalizedUrls) {
        if (target.url === source.url) continue;
        const targetKeywords = extractUrlKeywords(target.url);
        const common = sourceKeywords.filter((k) => targetKeywords.includes(k));
        if (common.length === 0) continue;

        const score = Math.min(100, Math.max(5, common.length * 25 + 10));
        const anchorText = fallbackPool.length > 0
          ? fallbackPool[hashCode(source.url + target.url) % fallbackPool.length]
          : `Learn more about ${common.join(' ')}`;

        rows.push({
          id: `auto_${source.url}_${target.url}`,
          sourceUrl: source.url,
          targetUrl: target.url,
          anchorText,
          score,
          keywords: common,
          source: 'auto',
        });
      }
    }
  }

  return rows
    .filter((r) => r.score > 10)
    .sort((a, b) => b.score - a.score || a.sourceUrl.localeCompare(b.sourceUrl));
};

// ───────────────────────────────────────────────────────────────────────
// CSV export
// ───────────────────────────────────────────────────────────────────────

const csvEscape = (v) => {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const downloadCsv = (suggestions) => {
  const header = ['Source URL', 'Target URL', 'Anchor Text', 'Score', 'Matched Keywords', 'Source', 'Edited'];
  const lines = [header.map(csvEscape).join(',')];
  for (const row of suggestions) {
    lines.push([
      row.sourceUrl,
      row.targetUrl,
      row.anchorText,
      row.score,
      (row.keywords || []).join(' | '),
      row.source,
      row.isOverridden ? 'yes' : 'no',
    ].map(csvEscape).join(','));
  }
  const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `internal-links-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// ───────────────────────────────────────────────────────────────────────
// Component
// ───────────────────────────────────────────────────────────────────────

const InternalLinkSeoTool = () => {
  const [inputValue, setInputValue] = useState('');
  const [anchorPoolInput, setAnchorPoolInput] = useState('');
  const [mappings, setMappings] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [anchorOverrides, setAnchorOverrides] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [editingValue, setEditingValue] = useState('');
  const fileInputRef = useRef(null);
  const urlFileInputRef = useRef(null);
  const [importNotice, setImportNotice] = useState('');

  // ── Load mappings from localStorage on mount ──
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setMappings(parsed);
      }
    } catch {
      // ignore
    }
  }, []);

  // ── Persist mappings whenever they change ──
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(mappings));
    } catch {
      // ignore quota
    }
  }, [mappings]);

  const urls = useMemo(
    () => inputValue.split(/\n|,|;/).map((s) => s.trim()).filter(Boolean),
    [inputValue]
  );

  const fallbackPool = useMemo(() => parseLines(anchorPoolInput), [anchorPoolInput]);

  const baseSuggestions = useMemo(
    () => buildSuggestions(urls, mappings, fallbackPool),
    [urls, mappings, fallbackPool]
  );

  const suggestions = useMemo(
    () =>
      baseSuggestions.map((s) => ({
        ...s,
        anchorText: anchorOverrides[s.id] ?? s.anchorText,
        isOverridden: anchorOverrides[s.id] !== undefined,
      })),
    [baseSuggestions, anchorOverrides]
  );

  const recommended = suggestions.slice(0, 30);
  const overrideCount = Object.keys(anchorOverrides).length;
  const mappingSuggestionCount = suggestions.filter((s) => s.source === 'mapping').length;

  // Reset row-level overrides if structure changes meaningfully
  useEffect(() => {
    setAnchorOverrides({});
  }, [inputValue, anchorPoolInput, mappings]);

  // ── Mapping CRUD ──
  const addMapping = () => setMappings((prev) => [...prev, emptyMapping()]);

  const updateMapping = (id, patch) =>
    setMappings((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));

  const removeMapping = (id) =>
    setMappings((prev) => prev.filter((m) => m.id !== id));

  const clearAllMappings = () => {
    if (window.confirm('Xoá tất cả mapping?')) setMappings([]);
  };

  const exportMappings = () => {
    const blob = new Blob([JSON.stringify(mappings, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mappings-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const importMappings = async (file) => {
    const name = (file.name || '').toLowerCase();
    try {
      const text = await readFileAsText(file);

      // CSV path
      if (name.endsWith('.csv') || (!name.endsWith('.json') && !text.trimStart().startsWith('['))) {
        const parsed = extractMappingsFromCsv(text);
        if (parsed.length === 0) throw new Error('Không tìm thấy mapping trong file CSV (cần 3 cột: keywords, url, anchors).');
        setMappings(parsed);
        setImportNotice(`✅ Đã import ${parsed.length} mapping từ CSV.`);
        return;
      }

      // JSON path
      const data = JSON.parse(text);
      if (!Array.isArray(data)) throw new Error('JSON phải là mảng các mapping.');
      const normalized = data.map((m) => ({
        id: m.id || newMappingId(),
        keywordsRaw: String(m.keywordsRaw ?? (Array.isArray(m.keywords) ? m.keywords.join('\n') : '')),
        targetUrl: String(m.targetUrl ?? ''),
        anchorsRaw: String(m.anchorsRaw ?? (Array.isArray(m.anchors) ? m.anchors.join('\n') : '')),
      }));
      setMappings(normalized);
      setImportNotice(`✅ Đã import ${normalized.length} mapping từ JSON.`);
    } catch (err) {
      alert('Không đọc được file: ' + err.message);
    }
  };

  const importUrlsFromFile = async (file) => {
    try {
      const urls = await extractUrlsFromFile(file);
      if (urls.length === 0) {
        alert('Không tìm thấy URL nào trong file. Hỗ trợ .txt / .csv / .xml (sitemap).');
        return;
      }
      // Append to existing (deduped)
      setInputValue((prev) => {
        const existing = new Set(parseLines(prev));
        const merged = [...parseLines(prev)];
        let added = 0;
        for (const u of urls) {
          if (!existing.has(u)) { merged.push(u); existing.add(u); added += 1; }
        }
        setImportNotice(`✅ Đã import ${urls.length} URL từ "${file.name}" (${added} mới, ${urls.length - added} đã có).`);
        return merged.join('\n');
      });
      setSubmitted(false);
    } catch (err) {
      alert('Không đọc được file: ' + err.message);
    }
  };

  // ── Anchor edit ──
  const startEdit = (row) => {
    setEditingId(row.id);
    setEditingValue(row.anchorText);
  };

  const saveEdit = useCallback(() => {
    if (editingId === null) return;
    const base = baseSuggestions.find((r) => r.id === editingId);
    const trimmed = editingValue.trim();
    setAnchorOverrides((prev) => {
      const next = { ...prev };
      if (!trimmed || (base && trimmed === base.anchorText)) delete next[editingId];
      else next[editingId] = trimmed;
      return next;
    });
    setEditingId(null);
    setEditingValue('');
  }, [editingId, editingValue, baseSuggestions]);

  const cancelEdit = () => {
    setEditingId(null);
    setEditingValue('');
  };

  const resetRow = (rowId) =>
    setAnchorOverrides((prev) => {
      const next = { ...prev };
      delete next[rowId];
      return next;
    });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-8">
      <div className="mx-auto w-full max-w-7xl rounded-3xl border border-slate-700 bg-slate-900/90 p-8 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
        <div className="mb-8 space-y-4">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-emerald-400">SEO Internal Link Generator</p>
            <h1 className="mt-3 text-4xl font-semibold text-white sm:text-5xl">Tool gợi ý internal link theo mapping</h1>
          </div>
          <p className="max-w-3xl text-slate-300">
            Định nghĩa <span className="font-semibold text-emerald-300">nhóm keyword → URL → anchor text</span> bên dưới, rồi paste danh sách URL cần gắn link.
            Tool sẽ tìm URL nào chứa keyword khớp và gợi ý link theo đúng anchor bạn định nghĩa.
          </p>
        </div>

        {/* ─────────────── Mapping Manager ─────────────── */}
        <section className="mb-8 rounded-3xl border border-emerald-400/30 bg-slate-950/70 p-6 ring-1 ring-emerald-400/20">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-white">📋 Mapping: keyword → URL → anchor</h2>
              <p className="mt-1 text-sm text-slate-400">
                Mỗi dòng = 1 nhóm. Keywords và anchor texts cách nhau bằng <kbd className="rounded bg-slate-800 px-1.5 py-0.5 text-xs">Enter</kbd> (mỗi dòng 1 cái). Tự lưu vào trình duyệt.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={addMapping}
                className="inline-flex h-10 items-center rounded-full bg-emerald-400 px-4 text-sm font-semibold text-slate-950 hover:bg-emerald-300"
              >
                + Thêm mapping
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex h-10 items-center rounded-full border border-slate-600 bg-slate-800 px-4 text-sm text-slate-200 hover:bg-slate-700"
                title="Cấu trúc CSV: keywords | url | anchors (mỗi dòng 1 mapping; nhiều keywords/anchors cách nhau bằng dòng mới hoặc dấu |)"
              >
                📥 Import JSON/CSV
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json,.csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) importMappings(e.target.files[0]);
                  e.target.value = '';
                }}
              />
              <button
                type="button"
                onClick={exportMappings}
                disabled={mappings.length === 0}
                className="inline-flex h-10 items-center rounded-full border border-slate-600 bg-slate-800 px-4 text-sm text-slate-200 hover:bg-slate-700 disabled:opacity-40"
              >
                📤 Export JSON
              </button>
              {mappings.length > 0 && (
                <button
                  type="button"
                  onClick={clearAllMappings}
                  className="inline-flex h-10 items-center rounded-full border border-rose-400/40 bg-rose-400/10 px-4 text-sm text-rose-300 hover:bg-rose-400/20"
                >
                  🗑 Xoá tất cả
                </button>
              )}
            </div>
          </div>

          {mappings.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-600 bg-slate-950/40 p-8 text-center text-sm text-slate-400">
              Chưa có mapping nào. Bấm <span className="font-semibold text-emerald-300">+ Thêm mapping</span> để bắt đầu.
              <br />
              Ví dụ: keywords = <code className="text-emerald-300">ghế văn phòng / ghế xoay</code>, URL = <code className="text-emerald-300">theone.vn/ghe-van-phong</code>, anchor = <code className="text-emerald-300">ghế văn phòng The One</code>.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-separate border-spacing-y-2 text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                    <th className="px-3 pb-2 w-[28%]">Keywords <span className="text-slate-500">(mỗi dòng 1 từ khoá)</span></th>
                    <th className="px-3 pb-2 w-[28%]">Target URL</th>
                    <th className="px-3 pb-2 w-[36%]">Anchor texts <span className="text-slate-500">(mỗi dòng 1 anchor)</span></th>
                    <th className="px-3 pb-2 w-[8%]"></th>
                  </tr>
                </thead>
                <tbody>
                  {mappings.map((m, idx) => (
                    <tr key={m.id} className="align-top">
                      <td className="rounded-l-2xl bg-slate-950/60 p-2">
                        <textarea
                          value={m.keywordsRaw}
                          onChange={(e) => updateMapping(m.id, { keywordsRaw: e.target.value })}
                          rows={3}
                          placeholder={'ghế văn phòng\nghế xoay\nghế lưới'}
                          className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/40"
                        />
                      </td>
                      <td className="bg-slate-950/60 p-2">
                        <input
                          type="text"
                          value={m.targetUrl}
                          onChange={(e) => updateMapping(m.id, { targetUrl: e.target.value })}
                          placeholder="https://theone.vn/ghe-van-phong"
                          className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/40"
                        />
                        <p className="mt-1 px-1 text-xs text-slate-500">Group #{idx + 1}</p>
                      </td>
                      <td className="bg-slate-950/60 p-2">
                        <textarea
                          value={m.anchorsRaw}
                          onChange={(e) => updateMapping(m.id, { anchorsRaw: e.target.value })}
                          rows={3}
                          placeholder={'ghế văn phòng The One\nghế xoay cao cấp\nmua ghế văn phòng'}
                          className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/40"
                        />
                      </td>
                      <td className="rounded-r-2xl bg-slate-950/60 p-2 text-center">
                        <button
                          type="button"
                          onClick={() => removeMapping(m.id)}
                          title="Xoá mapping"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-rose-400/30 text-rose-300 hover:bg-rose-500/15"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ─────────────── URL input + fallback anchor pool ─────────────── */}
        <div className="rounded-3xl bg-slate-950/70 p-6 ring-1 ring-slate-700">
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-sm font-semibold text-slate-300">📥 Danh sách URL (mỗi dòng 1 link)</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => urlFileInputRef.current?.click()}
                    className="inline-flex h-8 items-center rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3 text-xs font-semibold text-emerald-300 hover:bg-emerald-400/20"
                    title="Hỗ trợ .txt (mỗi dòng 1 URL), .csv (URL ở cột bất kỳ), .xml (sitemap)"
                  >
                    📂 Import file
                  </button>
                  {inputValue && (
                    <button
                      type="button"
                      onClick={() => { setInputValue(''); setSubmitted(false); setImportNotice(''); }}
                      className="inline-flex h-8 items-center rounded-full border border-slate-600 px-3 text-xs text-slate-400 hover:bg-slate-800"
                    >
                      Xoá
                    </button>
                  )}
                  <input
                    ref={urlFileInputRef}
                    type="file"
                    accept=".txt,.csv,.xml,text/plain,text/csv,application/xml,text/xml"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) importUrlsFromFile(e.target.files[0]);
                      e.target.value = '';
                    }}
                  />
                </div>
              </div>
              <textarea
                value={inputValue}
                onChange={(e) => { setInputValue(e.target.value); setSubmitted(false); }}
                rows={8}
                className="mt-3 w-full rounded-3xl border border-slate-700 bg-slate-950/80 px-4 py-4 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20"
                placeholder={'https://theone.vn/ghe-van-phong\nhttps://theone.vn/ban-lam-viec\nhttps://theone.vn/sofa-phong-khach'}
              />
              <p className="mt-2 text-xs text-slate-500">{urls.length} URL hợp lệ</p>
              {importNotice && (
                <div className="mt-2 flex items-start justify-between gap-2 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-xs text-emerald-200">
                  <span>{importNotice}</span>
                  <button type="button" onClick={() => setImportNotice('')} className="text-emerald-300 hover:text-white">✕</button>
                </div>
              )}
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-300">
                ✍️ Anchor fallback <span className="text-slate-500 font-normal">(dùng khi URL không khớp mapping nào)</span>
              </label>
              <textarea
                value={anchorPoolInput}
                onChange={(e) => { setAnchorPoolInput(e.target.value); setSubmitted(false); }}
                rows={8}
                className="mt-3 w-full rounded-3xl border border-slate-700 bg-slate-950/80 px-4 py-4 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20"
                placeholder={'tham khảo thêm\nxem chi tiết\nbài viết liên quan'}
              />
              <p className="mt-2 text-xs text-slate-500">{fallbackPool.length} anchor fallback</p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setSubmitted(true)}
              className="inline-flex h-12 items-center justify-center rounded-full bg-emerald-400 px-6 text-sm font-semibold text-slate-950 hover:bg-emerald-300"
            >
              🚀 Tạo gợi ý
            </button>
            {submitted && suggestions.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={() => downloadCsv(suggestions)}
                  className="inline-flex h-12 items-center justify-center rounded-full border border-emerald-400/40 bg-emerald-400/10 px-6 text-sm font-semibold text-emerald-300 hover:bg-emerald-400/20"
                >
                  ⬇️ Export CSV
                </button>
                {overrideCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setAnchorOverrides({})}
                    className="inline-flex h-12 items-center justify-center rounded-full border border-rose-400/40 bg-rose-400/10 px-6 text-sm font-semibold text-rose-300 hover:bg-rose-400/20"
                  >
                    ↺ Reset {overrideCount} chỉnh sửa
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* ─────────────── Results ─────────────── */}
        {submitted && (
          <div className="mt-8 space-y-6">
            <div className="grid gap-4 sm:grid-cols-5">
              <Stat label="URL nhập" value={urls.length} />
              <Stat label="Mapping" value={mappings.length} />
              <Stat label="Gợi ý từ mapping" value={mappingSuggestionCount} accent />
              <Stat label="Tổng gợi ý" value={suggestions.length} />
              <Stat label="Anchor đã sửa" value={overrideCount} />
            </div>

            {suggestions.length === 0 ? (
              <div className="rounded-3xl border border-rose-500/30 bg-rose-500/10 p-6 text-rose-200">
                <p className="font-semibold">Không có gợi ý nào.</p>
                <p className="mt-2 text-sm text-rose-100/80">
                  Có thể URL của bạn không chứa keyword nào trong mapping. Kiểm tra lại keywords (không cần dấu — tool tự normalize).
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-3xl border border-slate-700 bg-slate-950/80">
                <div className="overflow-x-auto">
                  <table className="min-w-full border-separate border-spacing-0 text-left text-sm text-slate-200">
                    <thead className="bg-slate-900">
                      <tr>
                        <th className="border-b border-slate-700 px-4 py-4">Source URL</th>
                        <th className="border-b border-slate-700 px-4 py-4">Target URL</th>
                        <th className="border-b border-slate-700 px-4 py-4">Anchor text <span className="text-xs font-normal text-slate-500">(click sửa)</span></th>
                        <th className="border-b border-slate-700 px-4 py-4">Matched</th>
                        <th className="border-b border-slate-700 px-4 py-4">Điểm</th>
                        <th className="border-b border-slate-700 px-4 py-4"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {recommended.map((item, index) => (
                        <tr key={item.id} className={index % 2 === 0 ? 'bg-slate-950/80' : 'bg-slate-900/70'}>
                          <td className="border-b border-slate-700 px-4 py-4 align-top break-words max-w-[200px]">{humanizeUrl(item.sourceUrl)}</td>
                          <td className="border-b border-slate-700 px-4 py-4 align-top break-words max-w-[200px]">
                            <div>{humanizeUrl(item.targetUrl)}</div>
                            <span
                              className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                                item.source === 'mapping'
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : 'bg-slate-700/60 text-slate-300'
                              }`}
                            >
                              {item.source === 'mapping' ? 'mapping' : 'auto'}
                            </span>
                          </td>
                          <td className="border-b border-slate-700 px-4 py-4 align-top">
                            {editingId === item.id ? (
                              <div className="flex flex-col gap-2">
                                <input
                                  type="text"
                                  value={editingValue}
                                  onChange={(e) => setEditingValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') saveEdit();
                                    if (e.key === 'Escape') cancelEdit();
                                  }}
                                  autoFocus
                                  className="w-full rounded-lg border border-emerald-400/60 bg-slate-950 px-3 py-2 text-sm text-emerald-100 outline-none focus:ring-2 focus:ring-emerald-400/40"
                                />
                                <div className="flex gap-2">
                                  <button type="button" onClick={saveEdit} className="rounded-md bg-emerald-400 px-3 py-1 text-xs font-semibold text-slate-950 hover:bg-emerald-300">💾 Lưu</button>
                                  <button type="button" onClick={cancelEdit} className="rounded-md border border-slate-600 px-3 py-1 text-xs text-slate-300 hover:bg-slate-800">✕ Hủy</button>
                                </div>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => startEdit(item)}
                                className="group inline-flex w-full items-start gap-2 rounded-lg px-2 py-1 text-left text-slate-100 hover:bg-slate-800/60"
                                title="Click để sửa"
                              >
                                <span className={item.isOverridden ? 'text-emerald-300' : 'text-slate-100'}>{item.anchorText}</span>
                                {item.isOverridden && (
                                  <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-300">edited</span>
                                )}
                                <span className="ml-auto opacity-0 transition group-hover:opacity-100 text-xs text-slate-400">✏️</span>
                              </button>
                            )}
                          </td>
                          <td className="border-b border-slate-700 px-4 py-4 align-top text-xs text-slate-400">
                            {(item.keywords || []).slice(0, 3).join(', ') || '—'}
                          </td>
                          <td className="border-b border-slate-700 px-4 py-4 align-top">
                            <span className="inline-flex rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300">{item.score}</span>
                          </td>
                          <td className="border-b border-slate-700 px-4 py-4 align-top">
                            {item.isOverridden && (
                              <button type="button" onClick={() => resetRow(item.id)} className="text-xs text-slate-400 underline-offset-2 hover:text-rose-300 hover:underline">reset</button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {suggestions.length > recommended.length && (
                  <div className="border-t border-slate-700 bg-slate-950/90 px-4 py-4 text-sm text-slate-400">
                    Hiển thị {recommended.length} dòng đầu trong tổng {suggestions.length}. Export CSV để lấy hết.
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const Stat = ({ label, value, accent }) => (
  <div className={`rounded-3xl border p-5 ${accent ? 'border-emerald-400/40 bg-emerald-400/5' : 'border-slate-700 bg-slate-950/80'}`}>
    <p className="text-sm text-slate-400">{label}</p>
    <p className={`mt-3 text-3xl font-semibold ${accent ? 'text-emerald-300' : 'text-white'}`}>{value}</p>
  </div>
);

export default InternalLinkSeoTool;
