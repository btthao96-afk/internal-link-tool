const natural = require('natural');
const db = require('../db/queries');
const CONST = require('../config/constants');

class NLPProcessor {
  constructor() {
    this.tokenizer = new natural.WordTokenizer();
    this.stopwords = new Set(CONST.STOPWORDS);
  }

  /**
   * Process all crawled pages - extract keywords with REAL TF-IDF
   * (tính document frequency trên toàn bộ corpus trước, rồi mới score từng page)
   */
  async processAllPages() {
    console.log('Processing all pages for NLP analysis...');

    const pages = await db.getAllPages('crawled');
    console.log(`Found ${pages.length} crawled pages`);

    if (pages.length === 0) return;

    // Bước 1: tokenize toàn bộ corpus
    const corpus = pages.map(p => this.tokenize(p.content || ''));

    // Bước 2: tính document frequency
    const docFreq = this.calculateDocFrequency(corpus);
    const N = pages.length;

    // Bước 3: tính TF-IDF cho từng page và lưu DB
    for (let i = 0; i < pages.length; i++) {
      const tokens = corpus[i];
      const tf = this.calculateFrequency(tokens);
      const keywords = this.scoreKeywordsTfIdf(tf, docFreq, N);
      await db.saveKeywords(pages[i].id, keywords);
    }

    console.log('NLP processing complete');
  }

  /**
   * Process single page (dùng khi không có corpus đầy đủ — fallback raw freq)
   */
  async processPage(pageId, content) {
    if (!content) return;

    const tokens = this.tokenize(content);
    const tf = this.calculateFrequency(tokens);

    // Không có corpus → score bằng raw frequency
    const keywords = Object.entries(tf)
      .filter(([w, f]) => f >= CONST.MIN_KEYWORD_FREQUENCY)
      .map(([w, f]) => ({ keyword: w, frequency: f, tfidf: f }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, CONST.TOP_KEYWORDS);

    await db.saveKeywords(pageId, keywords);
    return keywords;
  }

  /**
   * Tokenize — UNICODE AWARE (hỗ trợ tiếng Việt + mọi ngôn ngữ Unicode)
   *
   * Trước: regex /^[a-z0-9]+$/ → bỏ hết chữ có dấu (ghế, văn, phòng...)
   * Sau: regex /^[\p{L}\p{N}]+$/u → giữ mọi chữ Unicode
   */
  tokenize(text) {
    if (!text) return [];

    // Normalize NFC để chữ có dấu thống nhất (vd: 'ế' = U+1EBF)
    const normalized = text.toLowerCase().normalize('NFC');

    // Split theo whitespace + dấu câu Unicode (\p{P})
    const rawTokens = normalized.split(/[\s\p{P}]+/u);

    return rawTokens.filter(token => {
      if (!token || token.length <= 2) return false;
      if (this.stopwords.has(token)) return false;
      // Cho phép chữ Unicode (L) + số (N)
      return /^[\p{L}\p{N}]+$/u.test(token);
    });
  }

  /**
   * Calculate word frequency
   */
  calculateFrequency(tokens) {
    const frequencies = {};
    tokens.forEach(token => {
      frequencies[token] = (frequencies[token] || 0) + 1;
    });
    return frequencies;
  }

  /**
   * Document frequency: bao nhiêu document chứa từ này
   */
  calculateDocFrequency(corpus) {
    const df = {};
    corpus.forEach(tokens => {
      const unique = new Set(tokens);
      unique.forEach(t => { df[t] = (df[t] || 0) + 1; });
    });
    return df;
  }

  /**
   * TF-IDF công thức chuẩn: tf × log(N / df)
   */
  scoreKeywordsTfIdf(termFreq, docFreq, N) {
    return Object.entries(termFreq)
      .filter(([w, f]) => f >= CONST.MIN_KEYWORD_FREQUENCY)
      .map(([w, f]) => {
        const df = docFreq[w] || 1;
        const tfidf = f * Math.log(N / df);
        return { keyword: w, frequency: f, tfidf };
      })
      .sort((a, b) => b.tfidf - a.tfidf)
      .slice(0, CONST.TOP_KEYWORDS);
  }

  /**
   * Score keywords by raw frequency (legacy, vẫn giữ để backward-compat)
   */
  scoreKeywords(frequencies) {
    return Object.entries(frequencies)
      .filter(([word, freq]) => freq >= CONST.MIN_KEYWORD_FREQUENCY)
      .map(([word, freq]) => ({
        keyword: word,
        frequency: freq,
        tfidf: freq
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, CONST.TOP_KEYWORDS);
  }

  /**
   * Extract keywords from text (quick analysis, không cần corpus)
   */
  extractKeywords(text, topN = CONST.TOP_KEYWORDS) {
    const tokens = this.tokenize(text);
    const frequencies = this.calculateFrequency(tokens);

    return Object.entries(frequencies)
      .filter(([word, freq]) => freq >= CONST.MIN_KEYWORD_FREQUENCY)
      .sort((a, b) => b[1] - a[1])
      .slice(0, topN)
      .map(([word, freq]) => ({
        keyword: word,
        frequency: freq
      }));
  }

  /**
   * Trích n-gram (cụm 2-5 từ) — dùng cho anchor text generation
   *
   * Ví dụ: "bàn ghế văn phòng cao cấp" với n=2
   *   → ["bàn ghế", "ghế văn", "văn phòng", "phòng cao", "cao cấp"]
   */
  extractNgrams(text, n = 2) {
    const tokens = this.tokenize(text);
    if (tokens.length < n) return [];
    const ngrams = [];
    for (let i = 0; i <= tokens.length - n; i++) {
      ngrams.push(tokens.slice(i, i + n).join(' '));
    }
    return ngrams;
  }

  /**
   * Calculate semantic similarity between two keyword sets (Jaccard)
   */
  calculateSimilarity(keywords1, keywords2) {
    const set1 = new Set(keywords1.map(k => k.keyword));
    const set2 = new Set(keywords2.map(k => k.keyword));

    const intersection = [...set1].filter(k => set2.has(k));
    const union = new Set([...set1, ...set2]);

    const similarity = union.size > 0
      ? (intersection.length / union.size) * 100
      : 0;

    return {
      similarity: Math.round(similarity),
      shared: intersection,
      unique_to_page1: [...set1].filter(k => !set2.has(k)),
      unique_to_page2: [...set2].filter(k => !set1.has(k))
    };
  }

  /**
   * Calculate semantic score (0-100)
   */
  calculateSemanticScore(similarity) {
    return Math.round(similarity.similarity);
  }

  /**
   * Find related pages based on keyword overlap
   */
  async findRelatedPages(pageId) {
    const page = await db.getPageById(pageId);
    if (!page) return [];

    const pageKeywords = await db.getKeywordsByPageId(pageId);
    if (pageKeywords.length === 0) return [];

    const allPages = await db.getAllPages('crawled');
    const related = [];

    for (const otherPage of allPages) {
      if (otherPage.id === pageId) continue;

      const otherKeywords = await db.getKeywordsByPageId(otherPage.id);
      if (otherKeywords.length === 0) continue;

      const similarity = this.calculateSimilarity(pageKeywords, otherKeywords);
      const score = this.calculateSemanticScore(similarity);

      if (score >= CONST.RELEVANCE_THRESHOLD) {
        related.push({
          page_id: otherPage.id,
          page_url: otherPage.url,
          page_title: otherPage.title,
          score: score,
          shared_keywords: similarity.shared
        });
      }
    }

    return related.sort((a, b) => b.score - a.score);
  }
}

module.exports = new NLPProcessor();
