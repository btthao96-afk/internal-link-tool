const express = require('express');
const router = express.Router();
const db = require('../db/queries');
const Crawler = require('../services/crawler');
const nlp = require('../services/nlp');
const relevanceEngine = require('../services/relevanceEngine');
const suggestionGenerator = require('../services/suggestionGenerator');

/**
 * Start crawling a website
 * POST /api/crawler/start
 * Body: { url: "https://example.com", maxPages: 100 }
 */
router.post('/start', async (req, res) => {
  try {
    const { url, maxPages } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }
    
    const crawler = new Crawler(url, { maxPages });
    const pages = await crawler.crawl();
    
    res.json({
      success: true,
      pages_crawled: pages.length,
      pages: pages.map(p => ({ url: p.url, title: p.title }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get crawling status
 * GET /api/crawler/status
 */
router.get('/status', async (req, res) => {
  try {
    const stats = await db.getStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Process NLP for all pages
 * POST /api/analyzer/process
 */
router.post('/process', async (req, res) => {
  try {
    await nlp.processAllPages();
    const stats = await db.getStats();
    
    res.json({
      success: true,
      message: 'NLP processing complete',
      stats
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Build relationship graph
 * POST /api/analyzer/relationships
 */
router.post('/relationships', async (req, res) => {
  try {
    await relevanceEngine.buildRelationshipGraph();
    
    res.json({
      success: true,
      message: 'Relationship graph built'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Generate suggestions
 * POST /api/analyzer/generate-suggestions
 */
router.post('/generate-suggestions', async (req, res) => {
  try {
    const stats = await suggestionGenerator.generateSuggestionsWithStats();
    
    res.json({
      success: true,
      message: 'Suggestions generated',
      stats
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get pending suggestions
 * GET /api/suggestions/pending?limit=50
 */
router.get('/pending', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const suggestions = await db.getPendingSuggestions(limit);
    
    res.json({
      success: true,
      count: suggestions.length,
      suggestions
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Approve suggestion
 * POST /api/suggestions/:id/approve
 */
router.post('/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const { feedback } = req.body;
    
    const suggestion = await db.updateSuggestionStatus(id, 'approved', feedback);
    
    res.json({
      success: true,
      message: 'Suggestion approved',
      suggestion
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Reject suggestion
 * POST /api/suggestions/:id/reject
 */
router.post('/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const { feedback } = req.body;
    
    const suggestion = await db.updateSuggestionStatus(id, 'rejected', feedback);
    
    res.json({
      success: true,
      message: 'Suggestion rejected',
      suggestion
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get page details
 * GET /api/pages/:id
 */
router.get('/page/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const page = await db.getPageById(id);
    const keywords = await db.getKeywordsByPageId(id);
    const relatedPages = await db.getRelatedPages(id);
    
    res.json({
      success: true,
      page,
      keywords,
      related_pages: relatedPages
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get all pages
 * GET /api/pages
 */
router.get('/all', async (req, res) => {
  try {
    const pages = await db.getAllPages();
    
    res.json({
      success: true,
      count: pages.length,
      pages
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get statistics
 * GET /api/stats
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await db.getStats();
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
