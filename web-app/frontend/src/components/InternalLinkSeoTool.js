import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import {
  Plus,
  Upload,
  Download,
  Trash2,
  RotateCcw,
  X,
  Sparkles,
  FileSpreadsheet,
  Pencil,
  Check,
  Link2,
  Target,
  Tag,
  ListChecks,
  Hash,
  BookOpen,
  ChevronDown,
  ChevronUp,
  PlayCircle,
  Lightbulb,
} from 'lucide-react';

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

const removeDiacritics = (s) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');

const normalizeForMatch = (s) =>
  removeDiacritics(String(s || '').toLowerCase())
    .replace(/[-_/?=&#]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

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

// Parse one anchor line: "text" OR "text | 50" OR "text | 50%"
// Returns { text, weight } where weight=null when not specified
const parseAnchorLine = (line) => {
  const m = String(line || '').match(/^(.+?)\s*\|\s*(\d+(?:\.\d+)?)\s*%?\s*$/);
  if (m) {
    const w = parseFloat(m[2]);
    return { text: m[1].trim(), weight: Number.isFinite(w) ? w : null };
  }
  return { text: String(line || '').trim(), weight: null };
};

// Parse the whole anchor textarea → list of { text, weight, rawWeight }
// where weight is the FINAL normalized %. rawWeight stays null if unspecified.
//
// Rules:
//  • All unweighted → equal split (100/n each)
//  • All weighted   → normalize so sum = 100
//  • Mixed          → weighted lines keep their %, unweighted share remainder equally
const parseAnchorsWithWeights = (raw) => {
  const lines = parseLines(raw);
  if (lines.length === 0) return [];

  const items = lines.map(parseAnchorLine).filter((it) => it.text);
  if (items.length === 0) return [];

  const weighted = items.filter((it) => it.weight !== null);
  const unweighted = items.filter((it) => it.weight === null);
  const sumW = weighted.reduce((s, it) => s + it.weight, 0);

  let finalWeights;
  if (weighted.length === 0) {
    const equal = 100 / items.length;
    finalWeights = items.map(() => equal);
  } else if (unweighted.length === 0) {
    finalWeights = items.map((it) => (sumW > 0 ? (it.weight / sumW) * 100 : 100 / items.length));
  } else {
    const remainder = Math.max(0, 100 - sumW);
    const perUnweighted = unweighted.length > 0 ? remainder / unweighted.length : 0;
    finalWeights = items.map((it) => (it.weight !== null ? it.weight : perUnweighted));
  }

  return items.map((it, i) => ({
    text: it.text,
    weight: finalWeights[i],
    rawWeight: it.weight,
  }));
};

const newMappingId = () => `m_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

const emptyMapping = () => ({
  id: newMappingId(),
  keywordsRaw: '',
  targetUrl: '',
  anchorsRaw: '',
});

const buildHaystack = (url) => {
  try {
    const parsed = new URL(url);
    return normalizeForMatch(parsed.pathname + ' ' + parsed.search + ' ' + parsed.hash);
  } catch {
    return normalizeForMatch(url);
  }
};

const hashCode = (s) => {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
};

// ───────────────────────────────────────────────────────────────────────
// Suggestion engine
// ───────────────────────────────────────────────────────────────────────

// Build integer quotas summing to total, proportional to weights
const buildQuotas = (weights, total) => {
  if (total <= 0 || weights.length === 0) return weights.map(() => 0);
  const raw = weights.map((w) => (total * w) / 100);
  const quotas = raw.map((r) => Math.floor(r));
  let sum = quotas.reduce((s, q) => s + q, 0);
  // Distribute remainder to entries with largest fractional part
  const order = raw
    .map((r, i) => ({ i, frac: r - Math.floor(r) }))
    .sort((a, b) => b.frac - a.frac);
  let k = 0;
  while (sum < total && k < order.length) {
    quotas[order[k].i] += 1;
    sum += 1;
    k += 1;
  }
  return quotas;
};

const buildSuggestions = (urls, mappings, fallbackPool) => {
  const normalizedUrls = urls
    .map((url) => ({ original: url, url: normalizeUrl(url) }))
    .filter((item) => item.url);

  const validMappings = mappings
    .map((m) => ({
      ...m,
      keywords: parseLines(m.keywordsRaw),
      anchorItems: parseAnchorsWithWeights(m.anchorsRaw),
      targetUrl: normalizeUrl(m.targetUrl),
    }))
    .filter((m) => m.targetUrl && m.keywords.length > 0 && m.anchorItems.length > 0);

  const rows = [];

  for (const source of normalizedUrls) {
    const haystack = buildHaystack(source.url);
    let matchedAny = false;

    for (const mapping of validMappings) {
      if (mapping.targetUrl === source.url) continue;

      const matchedKeywords = mapping.keywords.filter((kw) =>
        haystack.includes(normalizeForMatch(kw))
      );
      if (matchedKeywords.length === 0) continue;

      const score = Math.min(100, 40 + matchedKeywords.length * 20);

      // anchorText assigned later in the quota pass
      rows.push({
        id: `map_${source.url}_${mapping.id}`,
        sourceUrl: source.url,
        targetUrl: mapping.targetUrl,
        anchorText: '',
        score,
        keywords: matchedKeywords,
        source: 'mapping',
        mappingId: mapping.id,
      });
      matchedAny = true;
    }

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

  // ── Distribute anchors per-mapping according to weights ──
  // Group mapping rows by mappingId, then assign anchors to hit exact %.
  const groups = new Map();
  for (const r of rows) {
    if (r.source !== 'mapping') continue;
    if (!groups.has(r.mappingId)) groups.set(r.mappingId, []);
    groups.get(r.mappingId).push(r);
  }

  for (const [mappingId, group] of groups.entries()) {
    const mapping = validMappings.find((m) => m.id === mappingId);
    if (!mapping) continue;

    // Sort sources deterministically so the same set always produces the
    // same anchor assignment.
    group.sort((a, b) => a.sourceUrl.localeCompare(b.sourceUrl));

    const quotas = buildQuotas(mapping.anchorItems.map((a) => a.weight), group.length);

    let idx = 0;
    for (let a = 0; a < mapping.anchorItems.length; a += 1) {
      for (let q = 0; q < quotas[a] && idx < group.length; q += 1) {
        group[idx].anchorText = mapping.anchorItems[a].text;
        idx += 1;
      }
    }
    // Safety: fill any leftover (shouldn't happen) with first anchor
    while (idx < group.length) {
      group[idx].anchorText = mapping.anchorItems[0].text;
      idx += 1;
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
  const [helpOpen, setHelpOpen] = useState(() => {
    try { return localStorage.getItem('ilt_help_open_v1') !== 'false'; }
    catch { return true; }
  });

  useEffect(() => {
    try { localStorage.setItem('ilt_help_open_v1', String(helpOpen)); }
    catch { /* ignore */ }
  }, [helpOpen]);

  const loadExample = () => {
    setMappings([
      {
        id: newMappingId(),
        keywordsRaw: 'ghế văn phòng\nghế xoay\nghế lưới',
        targetUrl: 'https://theone.vn/ghe-van-phong',
        anchorsRaw: 'ghế văn phòng The One | 50\nmua ghế xoay cao cấp | 30\nnội thất văn phòng | 20',
      },
      {
        id: newMappingId(),
        keywordsRaw: 'bàn làm việc\nbàn gỗ\nbàn họp',
        targetUrl: 'https://theone.vn/ban-lam-viec',
        anchorsRaw: 'bàn làm việc gỗ sồi\nbàn họp văn phòng\nbàn gỗ cao cấp',
      },
    ]);
    setInputValue(
      [
        'https://theone.vn/ghe-xoay-cao-cap',
        'https://theone.vn/ban-lam-viec-go-soi',
        'https://theone.vn/sofa-phong-khach',
        'https://theone.vn/ghe-luoi-gl363',
        'https://theone.vn/ban-hop-12-cho',
      ].join('\n')
    );
    setAnchorPoolInput('tham khảo thêm\nxem chi tiết\nbài viết liên quan');
    setSubmitted(true);
  };

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setMappings(parsed);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(mappings)); }
    catch { /* quota */ }
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

  useEffect(() => {
    setAnchorOverrides({});
  }, [inputValue, anchorPoolInput, mappings]);

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

  const importMappings = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!Array.isArray(data)) throw new Error('Not an array');
        const normalized = data.map((m) => ({
          id: m.id || newMappingId(),
          keywordsRaw: String(m.keywordsRaw ?? (Array.isArray(m.keywords) ? m.keywords.join('\n') : '')),
          targetUrl: String(m.targetUrl ?? ''),
          anchorsRaw: String(m.anchorsRaw ?? (Array.isArray(m.anchors) ? m.anchors.join('\n') : '')),
        }));
        setMappings(normalized);
      } catch (err) {
        alert('File JSON không hợp lệ: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

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
  const cancelEdit = () => { setEditingId(null); setEditingValue(''); };
  const resetRow = (rowId) =>
    setAnchorOverrides((prev) => {
      const next = { ...prev };
      delete next[rowId];
      return next;
    });

  const inputCls =
    'w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100';

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-gradient-to-br from-indigo-50/40 via-white to-violet-50/40 text-zinc-900 antialiased">
      {/* Decorative gradient orbs */}
      <div className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-indigo-300/20 blur-3xl" />
      <div className="pointer-events-none absolute top-40 -right-40 h-96 w-96 rounded-full bg-violet-300/20 blur-3xl" />
      <div className="pointer-events-none absolute top-[600px] left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-sky-200/20 blur-3xl" />

      <div className="relative mx-auto w-full max-w-6xl px-6 py-12">

        {/* ─── Hero header ─── */}
        <header className="mb-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200/60 bg-white/80 px-3 py-1 text-xs font-medium text-indigo-700 shadow-sm backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" />
            SEO Internal Linking
          </div>
          <h1 className="mt-5 bg-gradient-to-br from-zinc-900 via-indigo-900 to-violet-900 bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl">
            Internal Link Tool
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-zinc-600">
            Định nghĩa nhóm <span className="font-medium text-indigo-700">keyword</span> → <span className="font-medium text-violet-700">URL</span> → <span className="font-medium text-sky-700">anchor text</span>.
            Tool sẽ quét danh sách URL nguồn và gợi ý liên kết nội bộ theo đúng mapping của bạn.
          </p>
        </header>

        {/* ─── Help panel ─── */}
        <section className={`mb-8 overflow-hidden rounded-2xl border backdrop-blur transition ${helpOpen ? 'border-amber-200 bg-gradient-to-br from-amber-50/80 to-orange-50/40 shadow-sm shadow-amber-100/60' : 'border-zinc-200/80 bg-white/60'}`}>
          <button
            type="button"
            onClick={() => setHelpOpen((v) => !v)}
            className="flex w-full items-center justify-between gap-3 px-6 py-4 text-left"
          >
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-sm ${helpOpen ? 'bg-gradient-to-br from-amber-500 to-orange-500 shadow-amber-200' : 'bg-gradient-to-br from-zinc-400 to-zinc-500'}`}>
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-zinc-900">Hướng dẫn nhanh — 3 bước</div>
                <div className="text-xs text-zinc-500">
                  {helpOpen ? 'Nhấn để thu gọn' : 'Nhấn để xem cách điền và ví dụ'}
                </div>
              </div>
            </div>
            {helpOpen ? <ChevronUp className="h-5 w-5 text-zinc-400" /> : <ChevronDown className="h-5 w-5 text-zinc-400" />}
          </button>

          {helpOpen && (
            <div className="border-t border-amber-200/50 px-6 py-5">
              {/* ── 3 steps ── */}
              <ol className="space-y-3">
                <Step n={1} title="Tạo Mapping (rule gắn link)">
                  Bấm <span className="font-medium text-indigo-700">+ Thêm</span> ở khung dưới rồi điền 3 ô: <strong>keywords</strong>, <strong>target URL</strong>, <strong>anchor texts</strong>.
                  Mỗi mapping = "khi URL chứa keyword này → đặt link tới URL kia với chữ này".
                </Step>
                <Step n={2} title="Paste danh sách Source URLs">
                  Ở ô <span className="font-medium text-sky-700">Source URLs</span>, mỗi dòng 1 URL — đây là các trang trên website bạn muốn check để gợi ý link nội bộ.
                </Step>
                <Step n={3} title="Bấm Tạo gợi ý">
                  Tool quét slug từng URL nguồn, so khớp keyword trong mapping, rồi trả bảng <span className="font-medium">source → target → anchor</span> để bạn dán vào CMS.
                </Step>
              </ol>

              {/* ── Field explanations ── */}
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <FieldCard
                  icon={Hash}
                  iconCls="from-indigo-500 to-violet-500 shadow-indigo-200"
                  title="Keywords"
                  desc="Mỗi dòng 1 từ khoá. Có thể có dấu — tool tự normalize."
                  example={'ghế văn phòng\nghế xoay'}
                />
                <FieldCard
                  icon={Link2}
                  iconCls="from-violet-500 to-fuchsia-500 shadow-violet-200"
                  title="Target URL"
                  desc="URL đích bạn muốn dẫn link đến."
                  example={'https://...'}
                />
                <FieldCard
                  icon={Tag}
                  iconCls="from-sky-500 to-cyan-500 shadow-sky-200"
                  title="Anchor texts"
                  desc='Mỗi dòng 1 chữ link. Thêm "| 50" để gán tỉ lệ %.'
                  example={'ghế VP The One | 50\nmua ghế xoay | 30'}
                />
              </div>

              {/* ── Try example ── */}
              <div className="mt-5 flex flex-wrap items-center gap-3 rounded-xl border border-amber-200/60 bg-white/70 p-4">
                <Lightbulb className="h-5 w-5 shrink-0 text-amber-500" />
                <div className="flex-1 text-sm text-zinc-700">
                  <span className="font-medium text-zinc-900">Chưa biết bắt đầu?</span>{' '}
                  Bấm nút bên cạnh để tự động điền 2 mapping + 5 URL mẫu (e-commerce nội thất), tool sẽ chạy luôn để bạn thấy kết quả.
                </div>
                <button
                  type="button"
                  onClick={loadExample}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-amber-200 transition hover:shadow-md"
                >
                  <PlayCircle className="h-4 w-4" />
                  Thử dữ liệu mẫu
                </button>
              </div>
            </div>
          )}
        </section>

        {/* ─── Mapping section ─── */}
        <section className="mb-10 overflow-hidden rounded-2xl border border-zinc-200/80 bg-white/80 shadow-sm shadow-indigo-100/40 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 bg-gradient-to-r from-indigo-50/60 to-transparent px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-sm shadow-indigo-200">
                <Target className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-zinc-900">Keyword mapping</h2>
                <p className="text-xs text-zinc-500">Tự động lưu vào trình duyệt</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={addMapping}
                className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 px-3 py-1.5 text-sm font-medium text-white shadow-sm shadow-indigo-200 transition hover:shadow-md hover:shadow-indigo-200">
                <Plus className="h-4 w-4" />
                Thêm
              </button>
              <button type="button" onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:border-indigo-200 hover:bg-indigo-50/50 hover:text-indigo-700">
                <Upload className="h-4 w-4" />
                Import
              </button>
              <input ref={fileInputRef} type="file" accept="application/json,.json" className="hidden"
                onChange={(e) => { if (e.target.files?.[0]) importMappings(e.target.files[0]); e.target.value = ''; }} />
              <button type="button" onClick={exportMappings} disabled={mappings.length === 0}
                className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:border-indigo-200 hover:bg-indigo-50/50 hover:text-indigo-700 disabled:opacity-40 disabled:hover:border-zinc-200 disabled:hover:bg-white disabled:hover:text-zinc-700">
                <Download className="h-4 w-4" />
                Export
              </button>
              {mappings.length > 0 && (
                <button type="button" onClick={clearAllMappings}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-transparent px-3 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-50">
                  <Trash2 className="h-4 w-4" />
                  Clear
                </button>
              )}
            </div>
          </div>

          {mappings.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-100">
                <Target className="h-7 w-7 text-indigo-600" />
              </div>
              <p className="mt-4 text-sm font-medium text-zinc-900">Chưa có mapping nào</p>
              <p className="mt-1 text-sm text-zinc-500">
                Bấm <span className="font-medium text-indigo-700">Thêm</span> để tạo nhóm keyword đầu tiên
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                    <th className="px-5 py-3 w-[30%]">
                      <span className="inline-flex items-center gap-1.5"><Hash className="h-3 w-3 text-indigo-500" /> Keywords</span>
                    </th>
                    <th className="px-5 py-3 w-[30%]">
                      <span className="inline-flex items-center gap-1.5"><Link2 className="h-3 w-3 text-violet-500" /> Target URL</span>
                    </th>
                    <th className="px-5 py-3 w-[35%]">
                      <span className="inline-flex items-center gap-1.5">
                        <Tag className="h-3 w-3 text-sky-500" /> Anchor texts
                        <span className="font-normal normal-case tracking-normal text-zinc-400">— dùng <code className="rounded bg-zinc-100 px-1 text-[10px] text-zinc-700">anchor | 50</code> để gán %</span>
                      </span>
                    </th>
                    <th className="px-5 py-3 w-[5%]"></th>
                  </tr>
                </thead>
                <tbody>
                  {mappings.map((m, idx) => (
                    <tr key={m.id} className="border-t border-zinc-100 align-top transition hover:bg-zinc-50/40">
                      <td className="p-4">
                        <textarea
                          value={m.keywordsRaw}
                          onChange={(e) => updateMapping(m.id, { keywordsRaw: e.target.value })}
                          rows={3}
                          placeholder={'ghế văn phòng\nghế xoay'}
                          className={inputCls + ' resize-y'}
                        />
                      </td>
                      <td className="p-4">
                        <input
                          type="text"
                          value={m.targetUrl}
                          onChange={(e) => updateMapping(m.id, { targetUrl: e.target.value })}
                          placeholder="https://example.com/page"
                          className={inputCls}
                        />
                        <div className="mt-2 inline-flex items-center rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600">
                          Group #{idx + 1}
                        </div>
                      </td>
                      <td className="p-4">
                        <textarea
                          value={m.anchorsRaw}
                          onChange={(e) => updateMapping(m.id, { anchorsRaw: e.target.value })}
                          rows={3}
                          placeholder={'ghế văn phòng The One | 50\nmua ghế xoay | 30\nnội thất | 20'}
                          className={inputCls + ' resize-y font-mono text-[12px]'}
                        />
                        <WeightPreview anchorsRaw={m.anchorsRaw} />
                      </td>
                      <td className="p-4 text-center">
                        <button
                          type="button"
                          onClick={() => removeMapping(m.id)}
                          title="Xoá nhóm"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ─── Input section ─── */}
        <section className="mb-10 grid gap-6 lg:grid-cols-2">
          {/* Source URLs */}
          <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white/80 shadow-sm shadow-sky-100/40 backdrop-blur">
            <div className="flex items-center gap-3 border-b border-zinc-100 bg-gradient-to-r from-sky-50/60 to-transparent px-5 py-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-cyan-500 text-white shadow-sm shadow-sky-200">
                <Link2 className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-zinc-900">Source URLs</h3>
                <p className="text-xs text-zinc-500">Mỗi dòng một URL</p>
              </div>
              <span className="rounded-md bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-700 tabular-nums">
                {urls.length}
              </span>
            </div>
            <div className="p-5">
              <textarea
                value={inputValue}
                onChange={(e) => { setInputValue(e.target.value); setSubmitted(false); }}
                rows={9}
                className={inputCls + ' resize-y font-mono text-[13px]'}
                placeholder={'https://theone.vn/ghe-van-phong\nhttps://theone.vn/ban-lam-viec\nhttps://theone.vn/sofa-phong-khach'}
              />
            </div>
          </div>

          {/* Fallback anchors */}
          <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white/80 shadow-sm shadow-violet-100/40 backdrop-blur">
            <div className="flex items-center gap-3 border-b border-zinc-100 bg-gradient-to-r from-violet-50/60 to-transparent px-5 py-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-sm shadow-violet-200">
                <Tag className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-zinc-900">Fallback anchors</h3>
                <p className="text-xs text-zinc-500">Khi URL không khớp mapping</p>
              </div>
              <span className="rounded-md bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-700 tabular-nums">
                {fallbackPool.length}
              </span>
            </div>
            <div className="p-5">
              <textarea
                value={anchorPoolInput}
                onChange={(e) => { setAnchorPoolInput(e.target.value); setSubmitted(false); }}
                rows={9}
                className={inputCls + ' resize-y'}
                placeholder={'tham khảo thêm\nxem chi tiết\nbài viết liên quan'}
              />
            </div>
          </div>
        </section>

        {/* ─── Action bar ─── */}
        <section className="mb-8 flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => setSubmitted(true)}
            className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-200 transition hover:shadow-lg hover:shadow-indigo-300/60 hover:brightness-110 active:scale-[0.98]">
            <Sparkles className="h-4 w-4 transition group-hover:rotate-12" />
            Tạo gợi ý
          </button>
          {submitted && suggestions.length > 0 && (
            <>
              <button type="button" onClick={() => downloadCsv(suggestions)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-2.5 text-sm font-medium text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-50">
                <FileSpreadsheet className="h-4 w-4" />
                Export CSV
              </button>
              {overrideCount > 0 && (
                <button type="button" onClick={() => setAnchorOverrides({})}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-2.5 text-sm font-medium text-amber-700 transition hover:border-amber-300 hover:bg-amber-50">
                  <RotateCcw className="h-4 w-4" />
                  Reset {overrideCount} chỉnh sửa
                </button>
              )}
            </>
          )}
        </section>

        {/* ─── Results ─── */}
        {submitted && (
          <section>
            {/* Color-coded stat pills */}
            <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <StatPill icon={Link2} label="URLs" value={urls.length} tone="sky" />
              <StatPill icon={Target} label="Mappings" value={mappings.length} tone="indigo" />
              <StatPill icon={Sparkles} label="Mapping hits" value={mappingSuggestionCount} tone="violet" highlight />
              <StatPill icon={ListChecks} label="Total" value={suggestions.length} tone="emerald" />
              <StatPill icon={Pencil} label="Edited" value={overrideCount} tone="amber" />
            </div>

            {suggestions.length === 0 ? (
              <div className="rounded-2xl border border-zinc-200/80 bg-white/80 px-6 py-16 text-center backdrop-blur">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-zinc-100 to-zinc-200">
                  <Target className="h-7 w-7 text-zinc-400" />
                </div>
                <p className="mt-4 text-sm font-medium text-zinc-900">Không có gợi ý nào</p>
                <p className="mt-1 text-sm text-zinc-500">URL của bạn có thể không khớp keyword trong mapping. Kiểm tra lại keywords.</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white/90 shadow-sm shadow-indigo-100/40 backdrop-blur">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gradient-to-r from-indigo-50/40 via-violet-50/40 to-sky-50/40">
                      <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                        <th className="px-5 py-3.5">Source</th>
                        <th className="px-5 py-3.5">Target</th>
                        <th className="px-5 py-3.5">Anchor text</th>
                        <th className="px-5 py-3.5">Matched</th>
                        <th className="px-5 py-3.5 w-20 text-right">Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recommended.map((item) => (
                        <tr key={item.id} className="border-t border-zinc-100 transition hover:bg-indigo-50/20">
                          <td className="px-5 py-3.5 align-top max-w-[220px]">
                            <div className="break-words text-zinc-800">{humanizeUrl(item.sourceUrl)}</div>
                          </td>
                          <td className="px-5 py-3.5 align-top max-w-[220px]">
                            <div className="break-words text-zinc-800">{humanizeUrl(item.targetUrl)}</div>
                            <span
                              className={`mt-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                item.source === 'mapping'
                                  ? 'bg-gradient-to-r from-indigo-50 to-violet-50 text-indigo-700 ring-1 ring-indigo-200'
                                  : 'bg-zinc-100 text-zinc-600 ring-1 ring-zinc-200'
                              }`}
                            >
                              {item.source === 'mapping' && <Sparkles className="h-2.5 w-2.5" />}
                              {item.source}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 align-top">
                            {editingId === item.id ? (
                              <div className="flex flex-wrap items-center gap-2">
                                <input
                                  type="text"
                                  value={editingValue}
                                  onChange={(e) => setEditingValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') saveEdit();
                                    if (e.key === 'Escape') cancelEdit();
                                  }}
                                  autoFocus
                                  className={inputCls + ' min-w-[200px] flex-1'}
                                />
                                <button type="button" onClick={saveEdit} title="Lưu (Enter)"
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100">
                                  <Check className="h-4 w-4" />
                                </button>
                                <button type="button" onClick={cancelEdit} title="Hủy (Esc)"
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700">
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => startEdit(item)}
                                className="group flex w-full items-center gap-2 rounded-lg px-2 py-1 -mx-2 -my-1 text-left transition hover:bg-white hover:shadow-sm"
                              >
                                <span className={item.isOverridden ? 'text-indigo-700 font-medium' : 'text-zinc-800'}>
                                  {item.anchorText}
                                </span>
                                {item.isOverridden && (
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); resetRow(item.id); }}
                                    className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 hover:bg-amber-100"
                                    title="Khôi phục auto"
                                  >
                                    edited
                                  </button>
                                )}
                                <Pencil className="ml-auto h-3.5 w-3.5 text-indigo-400 opacity-0 transition group-hover:opacity-100" />
                              </button>
                            )}
                          </td>
                          <td className="px-5 py-3.5 align-top">
                            <div className="flex flex-wrap gap-1">
                              {(item.keywords || []).slice(0, 3).map((k, i) => (
                                <span key={i} className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-600">{k}</span>
                              ))}
                              {(!item.keywords || item.keywords.length === 0) && <span className="text-xs text-zinc-400">—</span>}
                            </div>
                          </td>
                          <td className="px-5 py-3.5 align-top text-right">
                            <ScoreBadge score={item.score} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {suggestions.length > recommended.length && (
                  <div className="border-t border-zinc-100 bg-gradient-to-r from-zinc-50/60 to-transparent px-5 py-3 text-xs text-zinc-500">
                    Hiển thị <span className="font-medium text-zinc-700">{recommended.length}</span> / {suggestions.length} gợi ý. Export CSV để lấy đầy đủ.
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        <footer className="mt-20 border-t border-zinc-200/60 pt-6 text-center text-xs text-zinc-400">
          Internal Link Tool · 2026
        </footer>
      </div>
    </div>
  );
};

// ───────────────────────────────────────────────────────────────────────
// Sub-components
// ───────────────────────────────────────────────────────────────────────

const TONE_STYLES = {
  sky:     { bg: 'from-sky-500 to-cyan-500',         ring: 'ring-sky-200',     pill: 'bg-sky-100 text-sky-700',         shadow: 'shadow-sky-100' },
  indigo:  { bg: 'from-indigo-500 to-blue-500',       ring: 'ring-indigo-200',  pill: 'bg-indigo-100 text-indigo-700',   shadow: 'shadow-indigo-100' },
  violet:  { bg: 'from-violet-500 to-fuchsia-500',    ring: 'ring-violet-200',  pill: 'bg-violet-100 text-violet-700',   shadow: 'shadow-violet-100' },
  emerald: { bg: 'from-emerald-500 to-teal-500',      ring: 'ring-emerald-200', pill: 'bg-emerald-100 text-emerald-700', shadow: 'shadow-emerald-100' },
  amber:   { bg: 'from-amber-500 to-orange-500',      ring: 'ring-amber-200',   pill: 'bg-amber-100 text-amber-700',     shadow: 'shadow-amber-100' },
};

const Step = ({ n, title, children }) => (
  <li className="flex gap-3">
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-500 text-xs font-bold text-white shadow-sm shadow-amber-200">
      {n}
    </div>
    <div className="flex-1 text-sm leading-relaxed text-zinc-700">
      <div className="font-semibold text-zinc-900">{title}</div>
      <div className="mt-0.5">{children}</div>
    </div>
  </li>
);

const FieldCard = ({ icon: Icon, iconCls, title, desc, example }) => (
  <div className="rounded-xl border border-zinc-200/80 bg-white p-3 shadow-sm">
    <div className="flex items-center gap-2">
      <div className={`flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br ${iconCls} text-white shadow-sm`}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="text-sm font-semibold text-zinc-900">{title}</div>
    </div>
    <p className="mt-2 text-xs text-zinc-600">{desc}</p>
    <pre className="mt-2 overflow-x-auto rounded-md bg-zinc-50 px-2 py-1.5 font-mono text-[11px] leading-relaxed text-zinc-700">{example}</pre>
  </div>
);

const WeightPreview = ({ anchorsRaw }) => {
  const items = parseAnchorsWithWeights(anchorsRaw);
  if (items.length === 0) return null;

  const sumRaw = items.reduce((s, it) => s + (it.rawWeight || 0), 0);
  const hasAnyExplicit = items.some((it) => it.rawWeight !== null);
  const tone =
    !hasAnyExplicit ? 'text-zinc-500' :
    Math.abs(sumRaw - 100) < 0.5 ? 'text-emerald-600' :
    sumRaw > 100 ? 'text-red-600' : 'text-amber-600';

  return (
    <div className="mt-2 space-y-1">
      {items.map((it, i) => (
        <div key={i} className="flex items-center gap-2 text-[11px]">
          <div className="flex-1 h-1.5 overflow-hidden rounded-full bg-zinc-100">
            <div
              className={`h-full rounded-full ${it.rawWeight !== null ? 'bg-gradient-to-r from-indigo-500 to-violet-500' : 'bg-zinc-300'}`}
              style={{ width: `${Math.min(100, it.weight)}%` }}
            />
          </div>
          <span className="w-10 text-right tabular-nums text-zinc-600">{it.weight.toFixed(0)}%</span>
        </div>
      ))}
      <div className="flex items-center justify-between pt-1 text-[10px]">
        {hasAnyExplicit ? (
          <span className={tone}>
            Sum: {sumRaw.toFixed(0)}%
            {Math.abs(sumRaw - 100) < 0.5 && ' ✓'}
            {sumRaw > 100 && ' (sẽ chuẩn hoá về 100%)'}
            {sumRaw < 100 && sumRaw > 0 && items.some((it) => it.rawWeight === null) && ' (phần còn lại chia đều cho anchor không gán %)'}
            {sumRaw < 100 && !items.some((it) => it.rawWeight === null) && ' (sẽ chuẩn hoá về 100%)'}
          </span>
        ) : (
          <span className="text-zinc-400">Equal split — thêm <code className="rounded bg-zinc-100 px-1 text-zinc-600">| 50</code> sau anchor để gán %</span>
        )}
      </div>
    </div>
  );
};

const StatPill = ({ icon: Icon, label, value, tone, highlight }) => {
  const t = TONE_STYLES[tone] || TONE_STYLES.indigo;
  return (
    <div className={`group relative overflow-hidden rounded-xl border border-zinc-200/80 bg-white/80 p-4 shadow-sm backdrop-blur transition hover:shadow-md ${highlight ? 'ring-2 ring-offset-2 ' + t.ring : ''}`}>
      <div className="flex items-center gap-3">
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br ${t.bg} text-white shadow-sm ${t.shadow}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="text-xs font-medium text-zinc-500">{label}</div>
          <div className="text-xl font-bold tabular-nums text-zinc-900">{value}</div>
        </div>
      </div>
    </div>
  );
};

const ScoreBadge = ({ score }) => {
  const tone =
    score >= 80 ? 'bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-sm shadow-emerald-200' :
    score >= 50 ? 'bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-sm shadow-amber-200' :
                  'bg-zinc-200 text-zinc-700';
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums ${tone}`}>
      {score}
    </span>
  );
};

export default InternalLinkSeoTool;
