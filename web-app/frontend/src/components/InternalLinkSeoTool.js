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
// Shared button styles
// ───────────────────────────────────────────────────────────────────────

const btnPrimary =
  'inline-flex items-center gap-1.5 rounded-md bg-zinc-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-40 disabled:hover:bg-zinc-900';
const btnSecondary =
  'inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-40';
const btnDanger =
  'inline-flex items-center gap-1.5 rounded-md border border-transparent px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50';
const iconBtn =
  'inline-flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700';

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
  const cancelEdit = () => { setEditingId(null); setEditingValue(''); };
  const resetRow = (rowId) =>
    setAnchorOverrides((prev) => {
      const next = { ...prev };
      delete next[rowId];
      return next;
    });

  const inputCls =
    'w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900/5';

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 antialiased">
      <div className="mx-auto w-full max-w-6xl px-6 py-12">

        {/* ─── Header ─── */}
        <header className="mb-10 border-b border-zinc-200 pb-8">
          <div className="flex items-center gap-2 text-zinc-400">
            <Link2 className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">SEO · Internal linking</span>
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">
            Internal Link Tool
          </h1>
          <p className="mt-3 max-w-2xl text-base text-zinc-600">
            Định nghĩa nhóm keyword → URL → anchor text. Tool sẽ quét danh sách URL nguồn và gợi ý liên kết nội bộ theo đúng mapping của bạn.
          </p>
        </header>

        {/* ─── Mapping section ─── */}
        <section className="mb-8">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900">Keyword mapping</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Mỗi nhóm gồm keywords, target URL và anchor texts. Lưu tự động vào trình duyệt.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={addMapping} className={btnSecondary}>
                <Plus className="h-4 w-4" />
                Thêm
              </button>
              <button type="button" onClick={() => fileInputRef.current?.click()} className={btnSecondary}>
                <Upload className="h-4 w-4" />
                Import
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
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
                className={btnSecondary}
              >
                <Download className="h-4 w-4" />
                Export
              </button>
              {mappings.length > 0 && (
                <button type="button" onClick={clearAllMappings} className={btnDanger}>
                  <Trash2 className="h-4 w-4" />
                  Clear all
                </button>
              )}
            </div>
          </div>

          {mappings.length === 0 ? (
            <div className="rounded-lg border border-dashed border-zinc-300 bg-white px-6 py-12 text-center">
              <p className="text-sm text-zinc-500">
                Chưa có mapping. Bấm <span className="font-medium text-zinc-900">Thêm</span> để tạo nhóm đầu tiên.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-zinc-50/80">
                    <tr className="text-left text-xs font-medium uppercase tracking-wide text-zinc-500">
                      <th className="px-4 py-3 w-[30%]">Keywords</th>
                      <th className="px-4 py-3 w-[30%]">Target URL</th>
                      <th className="px-4 py-3 w-[35%]">Anchor texts</th>
                      <th className="px-4 py-3 w-[5%]"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {mappings.map((m, idx) => (
                      <tr key={m.id} className="border-t border-zinc-100 align-top">
                        <td className="p-3">
                          <textarea
                            value={m.keywordsRaw}
                            onChange={(e) => updateMapping(m.id, { keywordsRaw: e.target.value })}
                            rows={3}
                            placeholder={'ghế văn phòng\nghế xoay'}
                            className={inputCls + ' resize-y'}
                          />
                        </td>
                        <td className="p-3">
                          <input
                            type="text"
                            value={m.targetUrl}
                            onChange={(e) => updateMapping(m.id, { targetUrl: e.target.value })}
                            placeholder="https://example.com/ghe-van-phong"
                            className={inputCls}
                          />
                          <p className="mt-1.5 text-[11px] text-zinc-400">Group #{idx + 1}</p>
                        </td>
                        <td className="p-3">
                          <textarea
                            value={m.anchorsRaw}
                            onChange={(e) => updateMapping(m.id, { anchorsRaw: e.target.value })}
                            rows={3}
                            placeholder={'ghế văn phòng The One\nmua ghế xoay'}
                            className={inputCls + ' resize-y'}
                          />
                        </td>
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => removeMapping(m.id)}
                            title="Xoá nhóm"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-zinc-400 hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        {/* ─── Input section ─── */}
        <section className="mb-8 grid gap-6 lg:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-zinc-900">Source URLs</label>
            <p className="mt-1 text-xs text-zinc-500">Mỗi dòng một URL — tool sẽ quét slug để khớp keyword.</p>
            <textarea
              value={inputValue}
              onChange={(e) => { setInputValue(e.target.value); setSubmitted(false); }}
              rows={9}
              className={'mt-3 ' + inputCls + ' resize-y font-mono text-[13px]'}
              placeholder={'https://theone.vn/ghe-van-phong\nhttps://theone.vn/ban-lam-viec\nhttps://theone.vn/sofa-phong-khach'}
            />
            <p className="mt-2 text-xs text-zinc-500">{urls.length} URL</p>
          </div>
          <div>
            <label className="text-sm font-medium text-zinc-900">Fallback anchors</label>
            <p className="mt-1 text-xs text-zinc-500">Tuỳ chọn — dùng khi URL không khớp mapping nào.</p>
            <textarea
              value={anchorPoolInput}
              onChange={(e) => { setAnchorPoolInput(e.target.value); setSubmitted(false); }}
              rows={9}
              className={'mt-3 ' + inputCls + ' resize-y'}
              placeholder={'tham khảo thêm\nxem chi tiết\nbài viết liên quan'}
            />
            <p className="mt-2 text-xs text-zinc-500">{fallbackPool.length} anchor</p>
          </div>
        </section>

        {/* ─── Action bar ─── */}
        <section className="mb-6 flex flex-wrap items-center gap-3 border-t border-b border-zinc-200 py-4">
          <button type="button" onClick={() => setSubmitted(true)} className={btnPrimary}>
            <Sparkles className="h-4 w-4" />
            Tạo gợi ý
          </button>
          {submitted && suggestions.length > 0 && (
            <>
              <button type="button" onClick={() => downloadCsv(suggestions)} className={btnSecondary}>
                <FileSpreadsheet className="h-4 w-4" />
                Export CSV
              </button>
              {overrideCount > 0 && (
                <button type="button" onClick={() => setAnchorOverrides({})} className={btnSecondary}>
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
            {/* Inline stats strip */}
            <div className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-zinc-600">
              <StatInline label="URLs" value={urls.length} />
              <StatInline label="Mappings" value={mappings.length} />
              <StatInline label="Mapping hits" value={mappingSuggestionCount} highlight />
              <StatInline label="Total suggestions" value={suggestions.length} />
              <StatInline label="Edited" value={overrideCount} />
            </div>

            {suggestions.length === 0 ? (
              <div className="rounded-lg border border-zinc-200 bg-white px-6 py-12 text-center">
                <p className="text-sm font-medium text-zinc-900">Không có gợi ý nào</p>
                <p className="mt-1 text-sm text-zinc-500">URL của bạn có thể không khớp keyword trong mapping. Kiểm tra lại keywords.</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-zinc-50/80">
                      <tr className="text-left text-xs font-medium uppercase tracking-wide text-zinc-500">
                        <th className="px-4 py-3">Source</th>
                        <th className="px-4 py-3">Target</th>
                        <th className="px-4 py-3">Anchor text</th>
                        <th className="px-4 py-3">Matched</th>
                        <th className="px-4 py-3 w-20 text-right">Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recommended.map((item) => (
                        <tr key={item.id} className="border-t border-zinc-100 hover:bg-zinc-50/60">
                          <td className="px-4 py-3 align-top max-w-[220px]">
                            <div className="break-words text-zinc-800">{humanizeUrl(item.sourceUrl)}</div>
                          </td>
                          <td className="px-4 py-3 align-top max-w-[220px]">
                            <div className="break-words text-zinc-800">{humanizeUrl(item.targetUrl)}</div>
                            <span
                              className={`mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                item.source === 'mapping'
                                  ? 'bg-indigo-50 text-indigo-700'
                                  : 'bg-zinc-100 text-zinc-600'
                              }`}
                            >
                              {item.source}
                            </span>
                          </td>
                          <td className="px-4 py-3 align-top">
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
                                <button type="button" onClick={saveEdit} className={iconBtn} title="Lưu (Enter)">
                                  <Check className="h-4 w-4 text-emerald-600" />
                                </button>
                                <button type="button" onClick={cancelEdit} className={iconBtn} title="Hủy (Esc)">
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => startEdit(item)}
                                className="group flex w-full items-center gap-2 rounded-md px-2 py-1 -mx-2 -my-1 text-left hover:bg-white"
                              >
                                <span className={item.isOverridden ? 'text-indigo-700 font-medium' : 'text-zinc-800'}>
                                  {item.anchorText}
                                </span>
                                {item.isOverridden && (
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); resetRow(item.id); }}
                                    className="text-[10px] text-zinc-400 hover:text-red-600"
                                    title="Khôi phục auto"
                                  >
                                    reset
                                  </button>
                                )}
                                <Pencil className="ml-auto h-3.5 w-3.5 text-zinc-300 opacity-0 transition group-hover:opacity-100" />
                              </button>
                            )}
                          </td>
                          <td className="px-4 py-3 align-top">
                            <span className="text-xs text-zinc-500">
                              {(item.keywords || []).slice(0, 3).join(', ') || '—'}
                            </span>
                          </td>
                          <td className="px-4 py-3 align-top text-right">
                            <ScoreBadge score={item.score} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {suggestions.length > recommended.length && (
                  <div className="border-t border-zinc-200 bg-zinc-50/60 px-4 py-3 text-xs text-zinc-500">
                    Hiển thị {recommended.length} / {suggestions.length} gợi ý. Export CSV để lấy đầy đủ.
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        <footer className="mt-16 border-t border-zinc-200 pt-6 text-xs text-zinc-400">
          Internal Link Tool · build 2026-05-14
        </footer>
      </div>
    </div>
  );
};

const StatInline = ({ label, value, highlight }) => (
  <div className="flex items-baseline gap-1.5">
    <span className={`text-base font-semibold tabular-nums ${highlight ? 'text-indigo-700' : 'text-zinc-900'}`}>
      {value}
    </span>
    <span className="text-xs text-zinc-500">{label}</span>
  </div>
);

const ScoreBadge = ({ score }) => {
  const tone =
    score >= 80 ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/10' :
    score >= 50 ? 'bg-amber-50 text-amber-700 ring-amber-600/10' :
                  'bg-zinc-100 text-zinc-600 ring-zinc-500/10';
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset tabular-nums ${tone}`}>
      {score}
    </span>
  );
};

export default InternalLinkSeoTool;
