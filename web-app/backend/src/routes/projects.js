const express = require('express');
const router = express.Router();
const { authenticateToken, requirePlan, crawlRateLimit } = require('../middleware/auth');
const { ProjectModel, UsageModel } = require('../models');
const Crawler = require('../services/crawler');
const nlp = require('../services/nlp');
const relevanceEngine = require('../services/relevanceEngine');
const suggestionGenerator = require('../services/suggestionGenerator');

/**
 * POST /projects/:projectId/crawl
 * Start crawling a project
 */
router.post('/:projectId/crawl', authenticateToken, crawlRateLimit, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { maxPages = 50 } = req.body;

    // Check if user owns project
    const project = await ProjectModel.getById(projectId, req.user.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check limits for free plan
    if (req.user.plan === 'free') {
      const canCrawl = await UsageModel.checkLimits(req.user.id, 'crawl', 5);
      if (!canCrawl) {
        return res.status(429).json({
          error: 'Limit exceeded',
          message: 'Free plan allows 5 crawls per day. Upgrade to Pro for unlimited crawls.'
        });
      }
    }

    // Update project status
    await ProjectModel.updateStatus(projectId, 'crawling');

    // Start crawling (async)
    const crawler = new Crawler(project.website_url, {
      maxPages,
      projectId,
      userId: req.user.id
    });

    // Run in background
    crawler.crawl().then(async (pages) => {
      await ProjectModel.updateStatus(projectId, 'completed');
      console.log(`Crawl completed for project ${projectId}: ${pages.length} pages`);
    }).catch(async (error) => {
      await ProjectModel.updateStatus(projectId, 'failed');
      console.error(`Crawl failed for project ${projectId}:`, error);
    });

    // Log action
    await UsageModel.logAction(req.user.id, 'crawl', projectId, { maxPages });

    res.json({
      success: true,
      message: 'Crawling started',
      projectId
    });
  } catch (error) {
    console.error('Crawl start error:', error);
    res.status(500).json({
      error: 'Failed to start crawling',
      message: error.message
    });
  }
});

/**
 * POST /projects/:projectId/analyze
 * Analyze crawled pages
 */
router.post('/:projectId/analyze', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;

    const project = await ProjectModel.getById(projectId, req.user.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check limits for free plan
    if (req.user.plan === 'free') {
      const canAnalyze = await UsageModel.checkLimits(req.user.id, 'analyze', 10);
      if (!canAnalyze) {
        return res.status(429).json({
          error: 'Limit exceeded',
          message: 'Free plan allows 10 analyses per day.'
        });
      }
    }

    // Run analysis (async)
    nlp.processAllPages(projectId).then(async () => {
      await ProjectModel.updateStatus(projectId, 'analyzed');
      console.log(`Analysis completed for project ${projectId}`);
    }).catch(async (error) => {
      console.error(`Analysis failed for project ${projectId}:`, error);
    });

    // Log action
    await UsageModel.logAction(req.user.id, 'analyze', projectId);

    res.json({
      success: true,
      message: 'Analysis started',
      projectId
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to start analysis',
      message: error.message
    });
  }
});

/**
 * POST /projects/:projectId/generate-suggestions
 * Generate link suggestions
 */
router.post('/:projectId/generate-suggestions', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;

    const project = await ProjectModel.getById(projectId, req.user.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check limits for free plan
    if (req.user.plan === 'free') {
      const canGenerate = await UsageModel.checkLimits(req.user.id, 'generate_suggestions', 5);
      if (!canGenerate) {
        return res.status(429).json({
          error: 'Limit exceeded',
          message: 'Free plan allows 5 suggestion generations per day.'
        });
      }
    }

    // Run suggestion generation (async)
    suggestionGenerator.generateAllSuggestions(projectId).then(async () => {
      console.log(`Suggestion generation completed for project ${projectId}`);
    }).catch(async (error) => {
      console.error(`Suggestion generation failed for project ${projectId}:`, error);
    });

    // Log action
    await UsageModel.logAction(req.user.id, 'generate_suggestions', projectId);

    res.json({
      success: true,
      message: 'Suggestion generation started',
      projectId
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to start suggestion generation',
      message: error.message
    });
  }
});

/**
 * GET /projects/:projectId/pages
 * Get project pages
 */
router.get('/:projectId/pages', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { status, limit = 50, offset = 0 } = req.query;

    const project = await ProjectModel.getById(projectId, req.user.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Get pages from database
    const pages = await require('../db/queries').getPagesByProject(projectId, status, limit, offset);

    res.json({
      success: true,
      pages,
      pagination: { limit: parseInt(limit), offset: parseInt(offset) }
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get pages',
      message: error.message
    });
  }
});

/**
 * GET /projects/:projectId/suggestions
 * Get project suggestions
 */
router.get('/:projectId/suggestions', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { status = 'pending', limit = 50 } = req.query;

    const project = await ProjectModel.getById(projectId, req.user.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const suggestions = await require('../db/queries').getSuggestionsByProject(projectId, status, limit);

    res.json({
      success: true,
      suggestions
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get suggestions',
      message: error.message
    });
  }
});

/**
 * POST /projects/:projectId/suggestions/:suggestionId/approve
 * Approve suggestion
 */
router.post('/:projectId/suggestions/:suggestionId/approve', authenticateToken, async (req, res) => {
  try {
    const { projectId, suggestionId } = req.params;
    const { feedback } = req.body;

    const project = await ProjectModel.getById(projectId, req.user.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const suggestion = await require('../db/queries').updateSuggestionStatus(suggestionId, 'approved', feedback);

    // Log action
    await UsageModel.logAction(req.user.id, 'approve_suggestion', projectId, { suggestionId });

    res.json({
      success: true,
      message: 'Suggestion approved',
      suggestion
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to approve suggestion',
      message: error.message
    });
  }
});

/**
 * POST /projects/:projectId/suggestions/:suggestionId/reject
 * Reject suggestion
 */
router.post('/:projectId/suggestions/:suggestionId/reject', authenticateToken, async (req, res) => {
  try {
    const { projectId, suggestionId } = req.params;
    const { feedback } = req.body;

    const project = await ProjectModel.getById(projectId, req.user.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const suggestion = await require('../db/queries').updateSuggestionStatus(suggestionId, 'rejected', feedback);

    // Log action
    await UsageModel.logAction(req.user.id, 'reject_suggestion', projectId, { suggestionId });

    res.json({
      success: true,
      message: 'Suggestion rejected',
      suggestion
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to reject suggestion',
      message: error.message
    });
  }
});

module.exports = router;
