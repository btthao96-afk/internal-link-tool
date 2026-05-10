const pool = require('../config/database');

/**
 * Database operations for pages
 */

// Get or create page
async function getOrCreatePage(url) {
  const query = `
    INSERT INTO pages (url, status)
    VALUES ($1, 'pending')
    ON CONFLICT (url) DO UPDATE SET updated_at = CURRENT_TIMESTAMP
    RETURNING *;
  `;
  const result = await pool.query(query, [url]);
  return result.rows[0];
}

// Update page data after crawling
async function updatePageData(pageId, data) {
  const query = `
    UPDATE pages
    SET title = $1, h1 = $2, meta_desc = $3, content = $4, 
        word_count = $5, status = 'crawled', updated_at = CURRENT_TIMESTAMP
    WHERE id = $6
    RETURNING *;
  `;
  const result = await pool.query(query, [
    data.title,
    data.h1,
    data.meta_desc,
    data.content,
    (data.content || '').split(/\s+/).length,
    pageId
  ]);
  return result.rows[0];
}

// Get all pages
async function getAllPages(status = null) {
  let query = 'SELECT * FROM pages';
  const params = [];
  
  if (status) {
    query += ' WHERE status = $1';
    params.push(status);
  }
  
  query += ' ORDER BY created_at DESC';
  const result = await pool.query(query, params);
  return result.rows;
}

// Get page by ID
async function getPageById(id) {
  const result = await pool.query('SELECT * FROM pages WHERE id = $1', [id]);
  return result.rows[0];
}

// Get page by URL
async function getPageByUrl(url) {
  const result = await pool.query('SELECT * FROM pages WHERE url = $1', [url]);
  return result.rows[0];
}

/**
 * Keywords operations
 */

async function saveKeywords(pageId, keywords) {
  const query = `
    INSERT INTO keywords (page_id, keyword, frequency, tf_idf_score, is_primary)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (page_id, keyword) 
    DO UPDATE SET frequency = $3, tf_idf_score = $4, is_primary = $5;
  `;
  
  for (let i = 0; i < keywords.length; i++) {
    const kw = keywords[i];
    await pool.query(query, [
      pageId,
      kw.keyword,
      kw.frequency,
      kw.tfidf || 0,
      i < 3 // First 3 are primary keywords
    ]);
  }
}

async function getKeywordsByPageId(pageId) {
  const result = await pool.query(
    'SELECT * FROM keywords WHERE page_id = $1 ORDER BY tf_idf_score DESC',
    [pageId]
  );
  return result.rows;
}

/**
 * Relationships operations
 */

async function saveRelationship(fromPageId, toPageId, relevanceScore, reason, sharedKeywords = []) {
  const query = `
    INSERT INTO relationships (from_page_id, to_page_id, relevance_score, reason, shared_keywords)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (from_page_id, to_page_id)
    DO UPDATE SET relevance_score = $3, reason = $4, shared_keywords = $5;
  `;
  
  const result = await pool.query(query, [
    fromPageId,
    toPageId,
    relevanceScore,
    reason,
    sharedKeywords
  ]);
  return result.rows[0];
}

async function getRelatedPages(pageId, limit = 10) {
  const result = await pool.query(`
    SELECT r.*, p.url, p.title
    FROM relationships r
    JOIN pages p ON r.to_page_id = p.id
    WHERE r.from_page_id = $1
    ORDER BY r.relevance_score DESC
    LIMIT $2;
  `, [pageId, limit]);
  return result.rows;
}

/**
 * Suggestions operations
 */

async function saveSuggestion(suggestion) {
  const query = `
    INSERT INTO suggestions 
    (from_page_id, to_page_id, anchor_text, suggested_paragraph, 
     suggested_context, relevance_score, link_type, status)
    VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
    ON CONFLICT (from_page_id, to_page_id, anchor_text)
    DO UPDATE SET relevance_score = $6, link_type = $7
    RETURNING *;
  `;
  
  const result = await pool.query(query, [
    suggestion.from_page_id,
    suggestion.to_page_id,
    suggestion.anchor_text,
    suggestion.suggested_paragraph || 1,
    suggestion.suggested_context || '',
    suggestion.relevance_score,
    suggestion.link_type || 'related'
  ]);
  return result.rows[0];
}

async function getPendingSuggestions(limit = 50) {
  const result = await pool.query(`
    SELECT s.*, p1.url as from_url, p1.title as from_title, 
           p2.url as to_url, p2.title as to_title
    FROM suggestions s
    JOIN pages p1 ON s.from_page_id = p1.id
    JOIN pages p2 ON s.to_page_id = p2.id
    WHERE s.status = 'pending'
    ORDER BY s.relevance_score DESC
    LIMIT $1;
  `, [limit]);
  return result.rows;
}

async function updateSuggestionStatus(suggestionId, status, feedback = null) {
  const query = `
    UPDATE suggestions
    SET status = $1, user_feedback = $2, approved_at = CASE 
      WHEN $1 = 'approved' THEN CURRENT_TIMESTAMP 
      ELSE approved_at 
    END
    WHERE id = $3
    RETURNING *;
  `;
  
  const result = await pool.query(query, [status, feedback, suggestionId]);
  return result.rows[0];
}

/**
 * Stats and analytics
 */

async function getStats() {
  const result = await pool.query(`
    SELECT 
      (SELECT COUNT(*) FROM pages) as total_pages,
      (SELECT COUNT(*) FROM pages WHERE status = 'crawled') as crawled_pages,
      (SELECT COUNT(*) FROM suggestions WHERE status = 'pending') as pending_suggestions,
      (SELECT COUNT(*) FROM suggestions WHERE status = 'approved') as approved_suggestions,
      (SELECT COUNT(*) FROM keywords) as total_keywords,
      (SELECT COUNT(*) FROM relationships) as total_relationships;
  `);
  return result.rows[0];
}

module.exports = {
  // Pages
  getOrCreatePage,
  updatePageData,
  getAllPages,
  getPageById,
  getPageByUrl,
  
  // Keywords
  saveKeywords,
  getKeywordsByPageId,
  
  // Relationships
  saveRelationship,
  getRelatedPages,
  
  // Suggestions
  saveSuggestion,
  getPendingSuggestions,
  updateSuggestionStatus,
  
  // Stats
  getStats,
  
  // Raw pool access if needed
  pool
};
