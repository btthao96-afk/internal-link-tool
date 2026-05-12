import React, { useMemo, useState, useEffect, useCallback } from 'react';

const normalizeUrl = (url) => {
  if (!url) return '';
  try {
    const normalized = new URL(url.trim().replace(/\s+/g, ''));
    return normalized.toString();
  } catch (e) {
    try {
      const normalized = new URL('https://' + url.trim().replace(/^https?:\/\//i, '').replace(/\s+/g, ''));
      return normalized.toString();
    } catch (err) {
      return '';
    }
  }
};

const extractKeywords = (url) => {
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

    return Array.from(new Set(parts.split(' ').filter((word) => word.length > 2 && !['www', 'com', 'html', 'php'].includes(word))));
  } catch (err) {
    return [];
  }
};

// Generate auto anchor — ưu tiên pool người dùng (nếu có), fallback về logic cũ
const buildAnchorText = (sourceKeywords, targetKeywords, targetUrl, pool, rowIndex) => {
  if (pool && pool.length > 0) {
    return pool[rowIndex % pool.length];
  }

  const common = sourceKeywords.filter((keyword) => targetKeywords.includes(keyword));
  if (common.length > 0) {
    const phrase = common.join(' ');
    return `Learn more about ${phrase}`;
  }

  if (targetKeywords.length > 0) {
    return `Visit ${targetKeywords.slice(0, 3).join(' ')}`;
  }

  return `Read more on this page`;
};

const createSuggestions = (urls, pool) => {
  const normalized = urls
    .map((url) => ({ original: url, url: normalizeUrl(url) }))
    .filter((item) => item.url);

  const rows = [];
  let rowIndex = 0;
  for (let i = 0; i < normalized.length; i += 1) {
    for (let j = 0; j < normalized.length; j += 1) {
      if (i === j) continue;
      const source = normalized[i];
      const target = normalized[j];
      const sourceKeywords = extractKeywords(source.url);
      const targetKeywords = extractKeywords(target.url);
      const common = sourceKeywords.filter((keyword) => targetKeywords.includes(keyword));
      const score = Math.min(100, Math.max(5, common.length * 25 + 10));
      const anchorText = buildAnchorText(sourceKeywords, targetKeywords, target.url, pool, rowIndex);
      rows.push({
        id: `${i}-${j}`,
        sourceUrl: source.url,
        targetUrl: target.url,
        anchorText,
        score,
        keywords: common,
      });
      rowIndex += 1;
    }
  }

  return rows
    .filter((row) => row.score > 10)
    .sort((a, b) => b.score - a.score || a.sourceUrl.localeCompare(b.sourceUrl));
};

const humanizeUrl = (url) => {
  try {
    const parsed = new URL(url);
    return parsed.hostname + parsed.pathname.replace(/\/$/, '');
  } catch (e) {
    return url;
  }
};

const csvEscape = (value) => {
  const s = String(value ?? '');
  if (/[",\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
};

const InternalLinkSeoTool = () => {
  const [inputValue, setInputValue] = useState('');
  const [anchorPoolInput, setAnchorPoolInput] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [anchorOverrides, setAnchorOverrides] = useState({}); // { rowId: customAnchor }
  const [editingId, setEditingId] = useState(null);
  const [editingValue, setEditingValue] = useState('');

  const urls = useMemo(() => {
    return inputValue
      .split(/\n|,|;/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  }, [inputValue]);

  const anchorPool = useMemo(() => {
    return anchorPoolInput
      .split(/\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  }, [anchorPoolInput]);

  const baseSuggestions = useMemo(() => createSuggestions(urls, anchorPool), [urls, anchorPool]);

  // Áp override của user lên suggestions
  const suggestions = useMemo(() => {
    return baseSuggestions.map((s) => ({
      ...s,
      anchorText: anchorOverrides[s.id] ?? s.anchorText,
      isOverridden: anchorOverrides[s.id] !== undefined,
    }));
  }, [baseSuggestions, anchorOverrides]);

  const recommended = suggestions.slice(0, 20);

  const handleStartEdit = (row) => {
    setEditingId(row.id);
    setEditingValue(row.anchorText);
  };

  const handleSaveEdit = useCallback(() => {
    if (editingId === null) return;
    const baseRow = baseSuggestions.find((r) => r.id === editingId);
    const trimmed = editingValue.trim();
    setAnchorOverrides((prev) => {
      const next = { ...prev };
      if (!trimmed || (baseRow && trimmed === baseRow.anchorText)) {
        delete next[editingId];
      } else {
        next[editingId] = trimmed;
      }
      return next;
    });
    setEditingId(null);
    setEditingValue('');
  }, [editingId, editingValue, baseSuggestions]);

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingValue('');
  };

  const handleResetRow = (rowId) => {
    setAnchorOverrides((prev) => {
      const next = { ...prev };
      delete next[rowId];
      return next;
    });
  };

  const handleResetAll = () => {
    setAnchorOverrides({});
  };

  const handleExportCsv = () => {
    const header = ['Source URL', 'Target URL', 'Anchor Text', 'Score', 'Shared Keywords', 'Edited'];
    const lines = [header.map(csvEscape).join(',')];
    suggestions.forEach((row) => {
      lines.push([
        row.sourceUrl,
        row.targetUrl,
        row.anchorText,
        row.score,
        (row.keywords || []).join(' | '),
        row.isOverridden ? 'yes' : 'no',
      ].map(csvEscape).join(','));
    });
    const csvContent = lines.join('\n');
    const blob = new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `internal-links-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Khi user thay đổi pool hoặc URLs, clear override (vì rowId có thể đổi nghĩa)
  useEffect(() => {
    setAnchorOverrides({});
  }, [inputValue, anchorPoolInput]);

  const overrideCount = Object.keys(anchorOverrides).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-8">
      <div className="mx-auto w-full max-w-6xl rounded-3xl border border-slate-700 bg-slate-900/90 p-8 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
        <div className="mb-8 space-y-4">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-emerald-400">SEO Internal Link Generator</p>
            <h1 className="mt-3 text-4xl font-semibold text-white sm:text-5xl">Tool gợi ý internal link và anchor text tự nhiên</h1>
          </div>
          <p className="max-w-3xl text-slate-300">
            Nhập danh sách URL, công cụ sẽ phân tích và đưa ra gợi ý liên kết nội bộ phù hợp cùng anchor text tự nhiên.
            Bạn có thể cung cấp <span className="font-semibold text-emerald-300">list anchor text tuỳ chỉnh</span> hoặc <span className="font-semibold text-emerald-300">sửa trực tiếp</span> từng dòng.
          </p>

          <div className="rounded-3xl bg-slate-950/70 p-6 ring-1 ring-slate-700">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* URL input */}
              <div>
                <label className="text-sm font-semibold text-slate-300">📥 Danh sách URL (mỗi dòng 1 link)</label>
                <textarea
                  value={inputValue}
                  onChange={(e) => { setInputValue(e.target.value); setSubmitted(false); }}
                  rows={10}
                  className="mt-3 w-full rounded-3xl border border-slate-700 bg-slate-950/80 px-4 py-4 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20"
                  placeholder={'https://example.com/seo-guide\nhttps://example.com/internal-linking\nhttps://example.com/seo-tips'}
                />
                <p className="mt-2 text-xs text-slate-500">{urls.length} URL hợp lệ</p>
              </div>

              {/* NEW: Anchor text pool */}
              <div>
                <label className="text-sm font-semibold text-slate-300">
                  ✍️ List anchor text tuỳ chỉnh <span className="text-slate-500 font-normal">(không bắt buộc)</span>
                </label>
                <textarea
                  value={anchorPoolInput}
                  onChange={(e) => { setAnchorPoolInput(e.target.value); setSubmitted(false); }}
                  rows={10}
                  className="mt-3 w-full rounded-3xl border border-slate-700 bg-slate-950/80 px-4 py-4 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20"
                  placeholder={'bàn ghế văn phòng\nnội thất the one\nghế lưới cao cấp\nsofa phòng khách\n...'}
                />
                <p className="mt-2 text-xs text-slate-500">
                  {anchorPool.length > 0
                    ? `${anchorPool.length} anchor — tool sẽ rotate qua list này`
                    : 'Trống → tool tự sinh từ URL'}
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setSubmitted(true)}
                className="inline-flex h-12 items-center justify-center rounded-full bg-emerald-400 px-6 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
              >
                🚀 Tạo gợi ý
              </button>
              {submitted && suggestions.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={handleExportCsv}
                    className="inline-flex h-12 items-center justify-center rounded-full border border-emerald-400/40 bg-emerald-400/10 px-6 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-400/20"
                  >
                    ⬇️ Export CSV
                  </button>
                  {overrideCount > 0 && (
                    <button
                      type="button"
                      onClick={handleResetAll}
                      className="inline-flex h-12 items-center justify-center rounded-full border border-rose-400/40 bg-rose-400/10 px-6 text-sm font-semibold text-rose-300 transition hover:bg-rose-400/20"
                    >
                      ↺ Reset {overrideCount} chỉnh sửa
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {submitted && (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-4">
              <div className="rounded-3xl border border-slate-700 bg-slate-950/80 p-5">
                <p className="text-sm text-slate-400">URL đã nhập</p>
                <p className="mt-3 text-3xl font-semibold text-white">{urls.length}</p>
              </div>
              <div className="rounded-3xl border border-slate-700 bg-slate-950/80 p-5">
                <p className="text-sm text-slate-400">Gợi ý liên kết</p>
                <p className="mt-3 text-3xl font-semibold text-white">{suggestions.length}</p>
              </div>
              <div className="rounded-3xl border border-slate-700 bg-slate-950/80 p-5">
                <p className="text-sm text-slate-400">Anchor pool</p>
                <p className="mt-3 text-3xl font-semibold text-white">{anchorPool.length}</p>
              </div>
              <div className="rounded-3xl border border-slate-700 bg-slate-950/80 p-5">
                <p className="text-sm text-slate-400">Anchor đã sửa</p>
                <p className="mt-3 text-3xl font-semibold text-white">{overrideCount}</p>
              </div>
            </div>

            {suggestions.length === 0 ? (
              <div className="rounded-3xl border border-rose-500/30 bg-rose-500/10 p-6 text-rose-200">
                <p className="font-semibold">Không tìm thấy gợi ý internal link.</p>
                <p className="mt-2 text-sm text-rose-100/80">Hãy thêm nhiều URL hơn hoặc các URL có nội dung liên quan để công cụ phân tích tốt nhất.</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-3xl border border-slate-700 bg-slate-950/80">
                <div className="overflow-x-auto">
                  <table className="min-w-full border-separate border-spacing-0 text-left text-sm text-slate-200">
                    <thead className="bg-slate-900">
                      <tr>
                        <th className="border-b border-slate-700 px-4 py-4">Source URL</th>
                        <th className="border-b border-slate-700 px-4 py-4">Target URL</th>
                        <th className="border-b border-slate-700 px-4 py-4">Anchor text <span className="text-xs font-normal text-slate-500">(click để sửa)</span></th>
                        <th className="border-b border-slate-700 px-4 py-4">Điểm</th>
                        <th className="border-b border-slate-700 px-4 py-4"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {recommended.map((item, index) => (
                        <tr key={item.id} className={index % 2 === 0 ? 'bg-slate-950/80' : 'bg-slate-900/70'}>
                          <td className="border-b border-slate-700 px-4 py-4 align-top break-words max-w-[200px]">{humanizeUrl(item.sourceUrl)}</td>
                          <td className="border-b border-slate-700 px-4 py-4 align-top break-words max-w-[200px]">{humanizeUrl(item.targetUrl)}</td>
                          <td className="border-b border-slate-700 px-4 py-4 align-top">
                            {editingId === item.id ? (
                              <div className="flex flex-col gap-2">
                                <input
                                  type="text"
                                  value={editingValue}
                                  onChange={(e) => setEditingValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveEdit();
                                    if (e.key === 'Escape') handleCancelEdit();
                                  }}
                                  autoFocus
                                  className="w-full rounded-lg border border-emerald-400/60 bg-slate-950 px-3 py-2 text-sm text-emerald-100 outline-none focus:ring-2 focus:ring-emerald-400/40"
                                />
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={handleSaveEdit}
                                    className="rounded-md bg-emerald-400 px-3 py-1 text-xs font-semibold text-slate-950 hover:bg-emerald-300"
                                  >
                                    💾 Lưu (Enter)
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleCancelEdit}
                                    className="rounded-md border border-slate-600 px-3 py-1 text-xs text-slate-300 hover:bg-slate-800"
                                  >
                                    ✕ Hủy (Esc)
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleStartEdit(item)}
                                className="group inline-flex w-full items-start gap-2 rounded-lg px-2 py-1 text-left text-slate-100 transition hover:bg-slate-800/60"
                                title="Click để sửa"
                              >
                                <span className={item.isOverridden ? 'text-emerald-300' : 'text-slate-100'}>
                                  {item.anchorText}
                                </span>
                                {item.isOverridden && (
                                  <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-300">
                                    edited
                                  </span>
                                )}
                                <span className="ml-auto opacity-0 transition group-hover:opacity-100 text-xs text-slate-400">✏️</span>
                              </button>
                            )}
                          </td>
                          <td className="border-b border-slate-700 px-4 py-4 align-top">
                            <span className="inline-flex rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300">{item.score}</span>
                          </td>
                          <td className="border-b border-slate-700 px-4 py-4 align-top">
                            {item.isOverridden && (
                              <button
                                type="button"
                                onClick={() => handleResetRow(item.id)}
                                className="text-xs text-slate-400 underline-offset-2 hover:text-rose-300 hover:underline"
                                title="Khôi phục auto-generate"
                              >
                                reset
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {suggestions.length > recommended.length && (
                  <div className="border-t border-slate-700 bg-slate-950/90 px-4 py-4 text-sm text-slate-400">
                    Hiển thị {recommended.length} gợi ý đầu tiên trong tổng số {suggestions.length}. Export CSV để lấy đầy đủ.
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

export default InternalLinkSeoTool;
