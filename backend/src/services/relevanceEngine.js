const db = require('../db/queries');
const nlp = require('./nlp');
const CONST = require('../config/constants');

class RelevanceEngine {
  /**
   * Build relationship graph for all pages
   */
  async buildRelationshipGraph() {
    console.log('Building page relationship graph...');
    
    const pages = await db.getAllPages('crawled');
    console.log(`Analyzing ${pages.length} pages...`);
    
    let count = 0;
    for (const page of pages) {
      const relatedPages = await nlp.findRelatedPages(page.id);
      
      for (const related of relatedPages) {
        if (related.score >= CONST.RELEVANCE_THRESHOLD) {
          await db.saveRelationship(
            page.id,
            related.page_id,
            related.score,
            'keyword_overlap',
            related.shared_keywords
          );
        }
      }
      
      count++;
      if (count % 10 === 0) {
        console.log(`Processed ${count}/${pages.length} pages`);
      }
    }
    
    console.log('Relationship graph complete');
  }

  /**
   * Calculate link priority for a page
   * - Traffic potential
   * - Authority level
   * - Freshness
   */
  calculatePageAuthority(page) {
    let score = 50; // Base score
    
    // Content length (more = more authority)
    const wordCount = (page.content || '').split(/\s+/).length;
    score += Math.min(wordCount / 100, 20); // Up to +20
    
    // Has H1 and meta description
    if (page.h1) score += 10;
    if (page.meta_desc) score += 10;
    
    // Freshness (recently updated)
    if (page.updated_at) {
      const daysOld = (Date.now() - new Date(page.updated_at)) / (1000 * 60 * 60 * 24);
      if (daysOld < 30) score += 15;
      else if (daysOld < 90) score += 10;
    }
    
    return Math.min(score, 100);
  }

  /**
   * Calculate link relevance score (0-100)
   * Factors:
   * - Keyword overlap
   * - Content similarity
   * - Topic clustering
   */
  async calculateLinkRelevance(fromPageId, toPageId) {
    const fromPage = await db.getPageById(fromPageId);
    const toPage = await db.getPageById(toPageId);
    
    if (!fromPage || !toPage) return 0;
    
    const fromKeywords = await db.getKeywordsByPageId(fromPageId);
    const toKeywords = await db.getKeywordsByPageId(toPageId);
    
    // Keyword overlap score
    const similarity = nlp.calculateSimilarity(fromKeywords, toKeywords);
    const keywordScore = similarity.similarity;
    
    // Authority of target page (should link to authoritative content)
    const targetAuthority = this.calculatePageAuthority(toPage);
    
    // Combined relevance score
    const relevance = (keywordScore * 0.7) + (targetAuthority * 0.3);
    
    return Math.round(relevance);
  }

  /**
   * Rank related pages by relevance
   */
  async rankRelatedPages(pageId, limit = 5) {
    const relatedPages = await db.getRelatedPages(pageId, limit * 2);
    
    const ranked = [];
    for (const related of relatedPages) {
      const relevance = await this.calculateLinkRelevance(pageId, related.to_page_id);
      ranked.push({
        ...related,
        relevance_score: relevance
      });
    }
    
    return ranked
      .sort((a, b) => b.relevance_score - a.relevance_score)
      .slice(0, limit);
  }

  /**
   * Determine link type (contextual categorization)
   */
  determineLinkType(fromPage, toPage, sharedKeywords) {
    // If target is more authoritative, it's a supporting link
    const fromAuth = this.calculatePageAuthority(fromPage);
    const toAuth = this.calculatePageAuthority(toPage);
    
    if (toAuth > fromAuth) {
      return 'supporting'; // Link to authoritative content
    }
    
    // If same level, it's a related link
    return 'related';
  }

  /**
   * Filter suggestions to avoid over-linking
   * - Don't link to same page
   * - Maintain reasonable link density
   * - Avoid linking to already-linked pages
   */
  async filterSuggestions(suggestions, fromPageId) {
    const filtered = [];
    const targetPageIds = new Set();
    
    for (const suggestion of suggestions) {
      // Skip self-links
      if (suggestion.to_page_id === fromPageId) continue;
      
      // Skip duplicates (only one link per target page)
      if (targetPageIds.has(suggestion.to_page_id)) continue;
      
      // Skip low relevance
      if (suggestion.relevance_score < CONST.RELEVANCE_THRESHOLD) continue;
      
      filtered.push(suggestion);
      targetPageIds.add(suggestion.to_page_id);
    }
    
    // Limit links per page
    return filtered.slice(0, CONST.LINKS_PER_PAGE);
  }

  /**
   * Score link placement opportunity
   * Optimal: mid-content paragraphs (avoid first and last)
   */
  async scoreLinkPlacement(content) {
    const paragraphs = content.split(/\n\n+/);
    const placements = [];
    
    paragraphs.forEach((para, index) => {
      // Skip very short paragraphs
      if (para.length < 100) return;
      
      // Skip first and last paragraphs
      if (index === 0 || index === paragraphs.length - 1) {
        placements.push({ index, score: 20 });
        return;
      }
      
      // Mid-content paragraphs get highest score
      placements.push({ index, score: 100 });
    });
    
    return placements.sort((a, b) => b.score - a.score);
  }
}

module.exports = new RelevanceEngine();
