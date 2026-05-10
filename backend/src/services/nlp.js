const natural = require('natural');
const db = require('../db/queries');
const CONST = require('../config/constants');

class NLPProcessor {
  constructor() {
    this.tokenizer = new natural.WordTokenizer();
    this.stopwords = new Set(CONST.STOPWORDS);
  }

  /**
   * Process all crawled pages - extract keywords and build corpus
   */
  async processAllPages() {
    console.log('Processing all pages for NLP analysis...');
    
    const pages = await db.getAllPages('crawled');
    console.log(`Found ${pages.length} crawled pages`);
    
    for (const page of pages) {
      await this.processPage(page.id, page.content);
    }
    
    console.log('NLP processing complete');
  }

  /**
   * Process single page - extract keywords and compute TF-IDF
   */
  async processPage(pageId, content) {
    if (!content) return;
    
    // Tokenize and clean
    const tokens = this.tokenize(content);
    
    // Calculate word frequencies
    const frequencies = this.calculateFrequency(tokens);
    
    // Filter and score keywords
    const keywords = this.scoreKeywords(frequencies);
    
    // Save to database
    await db.saveKeywords(pageId, keywords);
    
    return keywords;
  }

  /**
   * Tokenize and normalize text
   */
  tokenize(text) {
    if (!text) return [];
    
    // Convert to lowercase and tokenize
    const tokens = this.tokenizer.tokenize(text.toLowerCase());
    
    // Remove stopwords and short words
    const filtered = tokens.filter(token => {
      return !this.stopwords.has(token) && 
             token.length > 2 &&
             /^[a-z0-9]+$/.test(token); // Only alphanumeric
    });
    
    return filtered;
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
   * Score keywords by frequency
   */
  scoreKeywords(frequencies) {
    return Object.entries(frequencies)
      .filter(([word, freq]) => freq >= CONST.MIN_KEYWORD_FREQUENCY)
      .map(([word, freq]) => ({
        keyword: word,
        frequency: freq,
        tfidf: freq // Simplified - could use proper TF-IDF later
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, CONST.TOP_KEYWORDS);
  }

  /**
   * Extract keywords from text (for quick analysis)
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
   * Calculate semantic similarity between two keyword sets
   */
  calculateSimilarity(keywords1, keywords2) {
    const set1 = new Set(keywords1.map(k => k.keyword));
    const set2 = new Set(keywords2.map(k => k.keyword));
    
    // Find intersection
    const intersection = [...set1].filter(k => set2.has(k));
    
    // Find union
    const union = new Set([...set1, ...set2]);
    
    // Jaccard similarity
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
    
    // Sort by score descending
    return related.sort((a, b) => b.score - a.score);
  }
}

module.exports = new NLPProcessor();
