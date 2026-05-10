const db = require('../db/queries');
const relevanceEngine = require('./relevanceEngine');
const CONST = require('../config/constants');

class SuggestionGenerator {
  /**
   * Generate all suggestions for all pages
   */
  async generateAllSuggestions() {
    console.log('Generating internal link suggestions...');
    
    const pages = await db.getAllPages('crawled');
    console.log(`Processing ${pages.length} pages...`);
    
    let count = 0;
    let totalSuggestions = 0;
    
    for (const page of pages) {
      const suggestions = await this.generatePageSuggestions(page.id);
      totalSuggestions += suggestions.length;
      
      count++;
      if (count % 10 === 0) {
        console.log(`Processed ${count}/${pages.length} pages, ${totalSuggestions} suggestions`);
      }
    }
    
    console.log(`\nGeneration complete: ${totalSuggestions} suggestions created`);
    return totalSuggestions;
  }

  /**
   * Generate suggestions for single page
   */
  async generatePageSuggestions(pageId) {
    const page = await db.getPageById(pageId);
    if (!page || !page.content) return [];
    
    // Get ranked related pages
    const relatedPages = await relevanceEngine.rankRelatedPages(pageId, 10);
    
    // Filter to avoid over-linking
    const filtered = await relevanceEngine.filterSuggestions(relatedPages, pageId);
    
    const suggestions = [];
    
    for (const related of filtered) {
      const targetPage = await db.getPageById(related.to_page_id);
      
      // Generate anchor text options
      const anchorTexts = this.generateAnchorTexts(targetPage, related.shared_keywords);
      
      // Score link placements
      const placements = await relevanceEngine.scoreLinkPlacement(page.content);
      
      // Create suggestions
      for (const anchor of anchorTexts) {
        if (placements.length > 0) {
          const placement = placements[0];
          
          const suggestion = {
            from_page_id: pageId,
            to_page_id: related.to_page_id,
            anchor_text: anchor,
            suggested_paragraph: placement.index,
            suggested_context: this.extractContext(page.content, placement.index),
            relevance_score: related.relevance_score,
            link_type: relevanceEngine.determineLinkType(page, targetPage, related.shared_keywords || [])
          };
          
          try {
            const saved = await db.saveSuggestion(suggestion);
            suggestions.push(saved);
          } catch (error) {
            // Duplicate suggestion, skip
          }
        }
      }
    }
    
    return suggestions;
  }

  /**
   * Generate natural anchor text options
   */
  generateAnchorTexts(targetPage, sharedKeywords = []) {
    const anchors = new Set();
    
    // Option 1: Page title
    if (targetPage.title && targetPage.title.length <= 100) {
      anchors.add(targetPage.title);
    }
    
    // Option 2: H1
    if (targetPage.h1 && targetPage.h1.length <= 100) {
      anchors.add(targetPage.h1);
    }
    
    // Option 3: Primary keyword + descriptor
    if (sharedKeywords && sharedKeywords.length > 0) {
      const keyword = sharedKeywords[0];
      
      const descriptors = ['about', 'learn more about', 'related:', 'see also:', 'read more on'];
      descriptors.forEach(desc => {
        const text = `${desc} ${keyword}`;
        if (text.length <= 100) {
          anchors.add(text);
        }
      });
    }
    
    // Option 4: Generic related link text
    const genericOptions = [
      'learn more',
      'read more',
      'additional resources',
      'related content',
      'further reading'
    ];
    
    // Add title-based generic text
    if (targetPage.title) {
      const words = targetPage.title.split(/\s+/).slice(0, 3).join(' ');
      if (words.length > 0 && words.length <= 100) {
        anchors.add(words);
      }
    }
    
    // Convert to array and filter
    return Array.from(anchors)
      .filter(a => a.length >= CONST.MIN_ANCHOR_TEXT_LENGTH && 
                   a.length <= CONST.MAX_ANCHOR_TEXT_LENGTH)
      .slice(0, 3); // Return top 3 options
  }

  /**
   * Extract context around suggested paragraph
   */
  extractContext(content, paragraphIndex) {
    const paragraphs = content.split(/\n\n+/);
    
    if (paragraphIndex < 0 || paragraphIndex >= paragraphs.length) {
      return '';
    }
    
    const para = paragraphs[paragraphIndex];
    
    // Return first 200 characters of paragraph
    return para.substring(0, 200) + (para.length > 200 ? '...' : '');
  }

  /**
   * Batch generate and categorize suggestions
   */
  async generateSuggestionsWithStats() {
    const startTime = Date.now();
    
    await this.generateAllSuggestions();
    
    // Get statistics
    const stats = await db.getStats();
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log('\n=== Generation Statistics ===');
    console.log(`Total Pages: ${stats.total_pages}`);
    console.log(`Crawled Pages: ${stats.crawled_pages}`);
    console.log(`Suggestions Generated: ${stats.pending_suggestions}`);
    console.log(`Generation Time: ${duration}s`);
    console.log(`Avg per page: ${(stats.pending_suggestions / stats.crawled_pages).toFixed(1)} suggestions`);
    
    return stats;
  }
}

module.exports = new SuggestionGenerator();
