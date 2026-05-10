const pool = require('../config/database');

class UserModel {
  /**
   * Get user by ID
   */
  static async getById(id) {
    const result = await pool.query(`
      SELECT id, email, first_name, last_name, company, website, plan, is_active, email_verified, created_at, updated_at
      FROM users WHERE id = $1
    `, [id]);
    return result.rows[0];
  }

  /**
   * Get user by email
   */
  static async getByEmail(email) {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0];
  }

  /**
   * Update user profile
   */
  static async updateProfile(id, updates) {
    const { firstName, lastName, company, website } = updates;

    const result = await pool.query(`
      UPDATE users
      SET first_name = $1, last_name = $2, company = $3, website = $4, updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING id, email, first_name, last_name, company, website, plan, updated_at
    `, [firstName, lastName, company, website, id]);

    return result.rows[0];
  }

  /**
   * Change password
   */
  static async changePassword(id, newPasswordHash) {
    await pool.query(`
      UPDATE users
      SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [newPasswordHash, id]);
  }

  /**
   * Get user statistics
   */
  static async getStats(userId) {
    const result = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM projects WHERE user_id = $1) as total_projects,
        (SELECT COUNT(*) FROM pages p JOIN projects pr ON p.project_id = pr.id WHERE pr.user_id = $1) as total_pages,
        (SELECT COUNT(*) FROM suggestions s JOIN projects pr ON s.project_id = pr.id WHERE pr.user_id = $1 AND s.status = 'pending') as pending_suggestions,
        (SELECT COUNT(*) FROM suggestions s JOIN projects pr ON s.project_id = pr.id WHERE pr.user_id = $1 AND s.status = 'approved') as approved_suggestions
    `, [userId]);
    return result.rows[0];
  }
}

class ProjectModel {
  /**
   * Create new project
   */
  static async create(userId, projectData) {
    const { name, websiteUrl, description, crawlSettings } = projectData;

    const result = await pool.query(`
      INSERT INTO projects (user_id, name, website_url, description, crawl_settings)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [userId, name, websiteUrl, description || '', crawlSettings || {}]);

    return result.rows[0];
  }

  /**
   * Get user's projects
   */
  static async getUserProjects(userId, limit = 50, offset = 0) {
    const result = await pool.query(`
      SELECT * FROM projects
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `, [userId, limit, offset]);
    return result.rows;
  }

  /**
   * Get project by ID (ensure user owns it)
   */
  static async getById(projectId, userId) {
    const result = await pool.query(`
      SELECT * FROM projects
      WHERE id = $1 AND user_id = $2
    `, [projectId, userId]);
    return result.rows[0];
  }

  /**
   * Update project
   */
  static async update(projectId, userId, updates) {
    const { name, description, crawlSettings } = updates;

    const result = await pool.query(`
      UPDATE projects
      SET name = $1, description = $2, crawl_settings = $3, updated_at = CURRENT_TIMESTAMP
      WHERE id = $4 AND user_id = $5
      RETURNING *
    `, [name, description, crawlSettings, projectId, userId]);

    return result.rows[0];
  }

  /**
   * Delete project
   */
  static async delete(projectId, userId) {
    await pool.query('DELETE FROM projects WHERE id = $1 AND user_id = $2', [projectId, userId]);
    return true;
  }

  /**
   * Update project status
   */
  static async updateStatus(projectId, status) {
    await pool.query(`
      UPDATE projects
      SET status = $1, updated_at = CURRENT_TIMESTAMP,
          last_crawled_at = CASE WHEN $1 = 'completed' THEN CURRENT_TIMESTAMP ELSE last_crawled_at END
      WHERE id = $2
    `, [status, projectId]);
  }

  /**
   * Get project statistics
   */
  static async getStats(projectId) {
    const result = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM pages WHERE project_id = $1) as total_pages,
        (SELECT COUNT(*) FROM pages WHERE project_id = $1 AND status = 'crawled') as crawled_pages,
        (SELECT COUNT(*) FROM keywords k JOIN pages p ON k.page_id = p.id WHERE p.project_id = $1) as total_keywords,
        (SELECT COUNT(*) FROM relationships WHERE project_id = $1) as total_relationships,
        (SELECT COUNT(*) FROM suggestions WHERE project_id = $1 AND status = 'pending') as pending_suggestions,
        (SELECT COUNT(*) FROM suggestions WHERE project_id = $1 AND status = 'approved') as approved_suggestions
    `, [projectId]);
    return result.rows[0];
  }
}

class UsageModel {
  /**
   * Log user action
   */
  static async logAction(userId, action, projectId = null, metadata = {}) {
    await pool.query(`
      INSERT INTO usage_logs (user_id, action, project_id, metadata)
      VALUES ($1, $2, $3, $4)
    `, [userId, action, projectId, metadata]);
  }

  /**
   * Get user usage stats
   */
  static async getUserUsage(userId, days = 30) {
    const result = await pool.query(`
      SELECT
        action,
        COUNT(*) as count,
        MAX(created_at) as last_used
      FROM usage_logs
      WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY action
      ORDER BY count DESC
    `, [userId]);
    return result.rows;
  }

  /**
   * Check usage limits (for free plan)
   */
  static async checkLimits(userId, action, limit) {
    const result = await pool.query(`
      SELECT COUNT(*) as count
      FROM usage_logs
      WHERE user_id = $1 AND action = $2 AND created_at >= CURRENT_DATE
    `, [userId, action]);

    return result.rows[0].count < limit;
  }
}

module.exports = {
  UserModel,
  ProjectModel,
  UsageModel
};
