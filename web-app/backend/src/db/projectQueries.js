const pool = require('../config/database');

/**
 * Project-specific database operations
 */

// Get pages by project
async function getPagesByProject(projectId, status = null, limit = 50, offset = 0) {
  let query = 'SELECT * FROM pages WHERE project_id = $1';
  const params = [projectId];
  let paramIndex = 2;

  if (status) {
    query += ` AND status = $${paramIndex}`;
    params.push(status);
    paramIndex++;
  }

  query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
  params.push(limit, offset);

  const result = await pool.query(query, params);
  return result.rows;
}

// Get suggestions by project
async function getSuggestionsByProject(projectId, status = 'pending', limit = 50) {
  const result = await pool.query(`
    SELECT s.*, p1.url as from_url, p1.title as from_title,
           p2.url as to_url, p2.title as to_title
    FROM suggestions s
    JOIN pages p1 ON s.from_page_id = p1.id
    JOIN pages p2 ON s.to_page_id = p2.id
    WHERE s.project_id = $1 AND s.status = $2
    ORDER BY s.relevance_score DESC
    LIMIT $3;
  `, [projectId, status, limit]);
  return result.rows;
}

// Get keywords by project
async function getKeywordsByProject(projectId) {
  const result = await pool.query(`
    SELECT k.*, p.url as page_url, p.title as page_title
    FROM keywords k
    JOIN pages p ON k.page_id = p.id
    WHERE p.project_id = $1
    ORDER BY k.tf_idf_score DESC;
  `, [projectId]);
  return result.rows;
}

// Get relationships by project
async function getRelationshipsByProject(projectId, limit = 100) {
  const result = await pool.query(`
    SELECT r.*, p1.url as from_url, p1.title as from_title,
           p2.url as to_url, p2.title as to_title
    FROM relationships r
    JOIN pages p1 ON r.from_page_id = p1.id
    JOIN pages p2 ON r.to_page_id = p2.id
    WHERE r.project_id = $1
    ORDER BY r.relevance_score DESC
    LIMIT $2;
  `, [projectId, limit]);
  return result.rows;
}

// Update suggestion status
async function updateSuggestionStatus(suggestionId, status, feedback = null) {
  const result = await pool.query(`
    UPDATE suggestions
    SET status = $1, user_feedback = $2, approved_at = CASE
      WHEN $1 = 'approved' THEN CURRENT_TIMESTAMP
      ELSE approved_at
    END
    WHERE id = $3
    RETURNING *;
  `, [status, feedback, suggestionId]);
  return result.rows[0];
}

// Get project analytics
async function getProjectAnalytics(projectId, days = 30) {
  const result = await pool.query(`
    SELECT
      metric_name,
      metric_value,
      metric_date
    FROM analytics
    WHERE project_id = $1 AND metric_date >= CURRENT_DATE - INTERVAL '${days} days'
    ORDER BY metric_date DESC, metric_name;
  `, [projectId]);
  return result.rows;
}

// Bulk operations for efficiency
async function bulkInsertPages(projectId, pages) {
  const values = pages.map(page =>
    `(${projectId}, '${page.url}', '${(page.title || '').replace(/'/g, "''")}', '${(page.h1 || '').replace(/'/g, "''")}', '${(page.meta_desc || '').replace(/'/g, "''")}', '${(page.content || '').replace(/'/g, "''")}', ${page.word_count || 0}, 'crawled', CURRENT_TIMESTAMP)`
  ).join(', ');

  const query = `
    INSERT INTO pages (project_id, url, title, h1, meta_desc, content, word_count, status, crawled_at)
    VALUES ${values}
    ON CONFLICT (project_id, url) DO UPDATE SET
      title = EXCLUDED.title,
      h1 = EXCLUDED.h1,
      meta_desc = EXCLUDED.meta_desc,
      content = EXCLUDED.content,
      word_count = EXCLUDED.word_count,
      status = 'crawled',
      crawled_at = CURRENT_TIMESTAMP;
  `;

  await pool.query(query);
}

async function bulkInsertKeywords(keywords) {
  if (keywords.length === 0) return;

  const values = keywords.map(kw =>
    `(${kw.page_id}, '${kw.keyword}', ${kw.frequency}, ${kw.tf_idf_score || 0}, ${kw.is_primary ? 'true' : 'false'})`
  ).join(', ');

  const query = `
    INSERT INTO keywords (page_id, keyword, frequency, tf_idf_score, is_primary)
    VALUES ${values}
    ON CONFLICT (page_id, keyword) DO UPDATE SET
      frequency = EXCLUDED.frequency,
      tf_idf_score = EXCLUDED.tf_idf_score,
      is_primary = EXCLUDED.is_primary;
  `;

  await pool.query(query);
}

async function bulkInsertRelationships(projectId, relationships) {
  if (relationships.length === 0) return;

  const values = relationships.map(rel =>
    `(${projectId}, ${rel.from_page_id}, ${rel.to_page_id}, ${rel.relevance_score}, '${rel.reason}', '${JSON.stringify(rel.shared_keywords || []).replace(/'/g, "''")}')`
  ).join(', ');

  const query = `
    INSERT INTO relationships (project_id, from_page_id, to_page_id, relevance_score, reason, shared_keywords)
    VALUES ${values}
    ON CONFLICT (project_id, from_page_id, to_page_id) DO UPDATE SET
      relevance_score = EXCLUDED.relevance_score,
      reason = EXCLUDED.reason,
      shared_keywords = EXCLUDED.shared_keywords;
  `;

  await pool.query(query);
}

async function bulkInsertSuggestions(suggestions) {
  if (suggestions.length === 0) return;

  const values = suggestions.map(sugg =>
    `(${sugg.project_id}, ${sugg.from_page_id}, ${sugg.to_page_id}, '${sugg.anchor_text.replace(/'/g, "''")}', ${sugg.suggested_paragraph || 1}, '${(sugg.suggested_context || '').replace(/'/g, "''")}', ${sugg.relevance_score}, '${sugg.link_type || 'related'}', 'pending')`
  ).join(', ');

  const query = `
    INSERT INTO suggestions (project_id, from_page_id, to_page_id, anchor_text, suggested_paragraph, suggested_context, relevance_score, link_type, status)
    VALUES ${values}
    ON CONFLICT (project_id, from_page_id, to_page_id, anchor_text) DO UPDATE SET
      relevance_score = EXCLUDED.relevance_score,
      link_type = EXCLUDED.link_type;
  `;

  await pool.query(query);
}

module.exports = {
  getPagesByProject,
  getSuggestionsByProject,
  getKeywordsByProject,
  getRelationshipsByProject,
  updateSuggestionStatus,
  getProjectAnalytics,
  bulkInsertPages,
  bulkInsertKeywords,
  bulkInsertRelationships,
  bulkInsertSuggestions
};
