const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const authService = require('../auth/authService');
const { UserModel, ProjectModel, UsageModel } = require('../models');
const { authenticateToken, authRateLimit, requirePlan } = require('../middleware/auth');

// Validation rules
const registerValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('firstName').trim().isLength({ min: 1 }),
  body('lastName').trim().isLength({ min: 1 })
];

const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').exists()
];

const projectValidation = [
  body('name').trim().isLength({ min: 1, max: 255 }),
  body('websiteUrl').isURL(),
  body('description').optional().trim().isLength({ max: 1000 })
];

/**
 * POST /auth/register
 * Register new user
 */
router.post('/register', authRateLimit, registerValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { email, password, firstName, lastName, company, website } = req.body;

    const result = await authService.register({
      email,
      password,
      firstName,
      lastName,
      company,
      website
    });

    // Log registration
    await UsageModel.logAction(result.user.id, 'register');

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: result.user,
      token: result.token,
      refreshToken: result.refreshToken
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(400).json({
      error: 'Registration failed',
      message: error.message
    });
  }
});

/**
 * POST /auth/login
 * Login user
 */
router.post('/login', authRateLimit, loginValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { email, password } = req.body;

    const result = await authService.login(email, password);

    // Log login
    await UsageModel.logAction(result.user.id, 'login');

    res.json({
      success: true,
      message: 'Login successful',
      user: result.user,
      token: result.token,
      refreshToken: result.refreshToken
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(401).json({
      error: 'Login failed',
      message: error.message
    });
  }
});

/**
 * POST /auth/refresh
 * Refresh access token
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        error: 'Refresh token required'
      });
    }

    const result = await authService.refreshToken(refreshToken);

    res.json({
      success: true,
      user: result.user,
      token: result.token,
      refreshToken: result.refreshToken
    });
  } catch (error) {
    res.status(401).json({
      error: 'Token refresh failed',
      message: error.message
    });
  }
});

/**
 * POST /auth/logout
 * Logout user
 */
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    const { refreshToken } = req.body;
    await authService.logout(refreshToken);

    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    res.status(500).json({
      error: 'Logout failed',
      message: error.message
    });
  }
});

/**
 * GET /auth/me
 * Get current user profile
 */
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await UserModel.getById(req.user.id);
    const stats = await UserModel.getStats(req.user.id);

    res.json({
      success: true,
      user,
      stats
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get user profile',
      message: error.message
    });
  }
});

/**
 * PUT /auth/profile
 * Update user profile
 */
router.put('/profile', authenticateToken, [
  body('firstName').optional().trim().isLength({ min: 1 }),
  body('lastName').optional().trim().isLength({ min: 1 }),
  body('company').optional().trim(),
  body('website').optional().isURL()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const user = await UserModel.updateProfile(req.user.id, req.body);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to update profile',
      message: error.message
    });
  }
});

/**
 * POST /projects
 * Create new project
 */
router.post('/projects', authenticateToken, projectValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    // Check usage limits for free plan
    if (req.user.plan === 'free') {
      const canCreate = await UsageModel.checkLimits(req.user.id, 'create_project', 3);
      if (!canCreate) {
        return res.status(429).json({
          error: 'Limit exceeded',
          message: 'Free plan allows maximum 3 projects. Upgrade to Pro for unlimited projects.'
        });
      }
    }

    const project = await ProjectModel.create(req.user.id, req.body);

    // Log action
    await UsageModel.logAction(req.user.id, 'create_project', project.id);

    res.status(201).json({
      success: true,
      message: 'Project created successfully',
      project
    });
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({
      error: 'Failed to create project',
      message: error.message
    });
  }
});

/**
 * GET /projects
 * Get user's projects
 */
router.get('/projects', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const projects = await ProjectModel.getUserProjects(req.user.id, limit, offset);

    res.json({
      success: true,
      projects,
      pagination: {
        page,
        limit,
        offset
      }
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get projects',
      message: error.message
    });
  }
});

/**
 * GET /projects/:id
 * Get project details
 */
router.get('/projects/:id', authenticateToken, async (req, res) => {
  try {
    const project = await ProjectModel.getById(req.params.id, req.user.id);

    if (!project) {
      return res.status(404).json({
        error: 'Project not found'
      });
    }

    const stats = await ProjectModel.getStats(project.id);

    res.json({
      success: true,
      project: {
        ...project,
        stats
      }
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get project',
      message: error.message
    });
  }
});

/**
 * PUT /projects/:id
 * Update project
 */
router.put('/projects/:id', authenticateToken, projectValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const project = await ProjectModel.update(req.params.id, req.user.id, req.body);

    if (!project) {
      return res.status(404).json({
        error: 'Project not found'
      });
    }

    res.json({
      success: true,
      message: 'Project updated successfully',
      project
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to update project',
      message: error.message
    });
  }
});

/**
 * DELETE /projects/:id
 * Delete project
 */
router.delete('/projects/:id', authenticateToken, async (req, res) => {
  try {
    const project = await ProjectModel.getById(req.params.id, req.user.id);

    if (!project) {
      return res.status(404).json({
        error: 'Project not found'
      });
    }

    await ProjectModel.delete(req.params.id, req.user.id);

    // Log action
    await UsageModel.logAction(req.user.id, 'delete_project', req.params.id);

    res.json({
      success: true,
      message: 'Project deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to delete project',
      message: error.message
    });
  }
});

module.exports = router;
