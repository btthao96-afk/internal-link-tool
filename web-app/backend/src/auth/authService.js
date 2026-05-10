const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');

class AuthService {
  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '24h';
    this.refreshTokenExpiresIn = 7 * 24 * 60 * 60 * 1000; // 7 days
  }

  /**
   * Hash password
   */
  async hashPassword(password) {
    const saltRounds = 10;
    return await bcrypt.hash(password, saltRounds);
  }

  /**
   * Verify password
   */
  async verifyPassword(password, hash) {
    return await bcrypt.compare(password, hash);
  }

  /**
   * Generate JWT token
   */
  generateToken(user) {
    const payload = {
      userId: user.id,
      email: user.email,
      plan: user.plan
    };

    return jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.jwtExpiresIn
    });
  }

  /**
   * Generate refresh token
   */
  generateRefreshToken() {
    return require('crypto').randomBytes(64).toString('hex');
  }

  /**
   * Verify JWT token
   */
  verifyToken(token) {
    try {
      return jwt.verify(token, this.jwtSecret);
    } catch (error) {
      return null;
    }
  }

  /**
   * Register new user
   */
  async register(userData) {
    const { email, password, firstName, lastName, company, website } = userData;

    // Check if user exists
    const existingUser = await this.getUserByEmail(email);
    if (existingUser) {
      throw new Error('User already exists');
    }

    // Hash password
    const passwordHash = await this.hashPassword(password);

    // Create user
    const query = `
      INSERT INTO users (email, password_hash, first_name, last_name, company, website)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, email, first_name, last_name, company, website, plan, created_at
    `;

    const result = await pool.query(query, [
      email,
      passwordHash,
      firstName,
      lastName,
      company,
      website
    ]);

    const user = result.rows[0];

    // Generate tokens
    const token = this.generateToken(user);
    const refreshToken = this.generateRefreshToken();

    // Store refresh token
    await this.storeRefreshToken(user.id, refreshToken);

    return {
      user,
      token,
      refreshToken
    };
  }

  /**
   * Login user
   */
  async login(email, password) {
    // Get user
    const user = await this.getUserByEmail(email);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Verify password
    const isValidPassword = await this.verifyPassword(password, user.password_hash);
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    // Check if user is active
    if (!user.is_active) {
      throw new Error('Account is deactivated');
    }

    // Generate tokens
    const token = this.generateToken(user);
    const refreshToken = this.generateRefreshToken();

    // Store refresh token
    await this.storeRefreshToken(user.id, refreshToken);

    // Remove password hash from response
    delete user.password_hash;

    return {
      user,
      token,
      refreshToken
    };
  }

  /**
   * Refresh token
   */
  async refreshToken(refreshToken) {
    // Verify refresh token
    const session = await this.getSessionByToken(refreshToken);
    if (!session) {
      throw new Error('Invalid refresh token');
    }

    // Check if expired
    if (new Date() > session.expires_at) {
      await this.deleteSession(session.id);
      throw new Error('Refresh token expired');
    }

    // Get user
    const user = await this.getUserById(session.user_id);
    if (!user || !user.is_active) {
      throw new Error('User not found or inactive');
    }

    // Generate new tokens
    const newToken = this.generateToken(user);
    const newRefreshToken = this.generateRefreshToken();

    // Update session
    await this.updateSession(session.id, newRefreshToken);

    delete user.password_hash;

    return {
      user,
      token: newToken,
      refreshToken: newRefreshToken
    };
  }

  /**
   * Logout (invalidate refresh token)
   */
  async logout(refreshToken) {
    const session = await this.getSessionByToken(refreshToken);
    if (session) {
      await this.deleteSession(session.id);
    }
    return true;
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email) {
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    return result.rows[0];
  }

  /**
   * Get user by ID
   */
  async getUserById(id) {
    const result = await pool.query(
      'SELECT id, email, first_name, last_name, company, website, plan, is_active, email_verified, created_at, updated_at FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0];
  }

  /**
   * Store refresh token
   */
  async storeRefreshToken(userId, token) {
    const expiresAt = new Date(Date.now() + this.refreshTokenExpiresIn);
    const tokenHash = await this.hashPassword(token); // Hash for security

    const query = `
      INSERT INTO user_sessions (user_id, token_hash, expires_at)
      VALUES ($1, $2, $3)
      RETURNING id
    `;

    await pool.query(query, [userId, tokenHash, expiresAt]);
  }

  /**
   * Get session by token
   */
  async getSessionByToken(token) {
    const tokenHash = await this.hashPassword(token);
    const result = await pool.query(
      'SELECT * FROM user_sessions WHERE token_hash = $1',
      [tokenHash]
    );
    return result.rows[0];
  }

  /**
   * Update session with new token
   */
  async updateSession(sessionId, newToken) {
    const expiresAt = new Date(Date.now() + this.refreshTokenExpiresIn);
    const tokenHash = await this.hashPassword(newToken);

    await pool.query(
      'UPDATE user_sessions SET token_hash = $1, expires_at = $2 WHERE id = $3',
      [tokenHash, expiresAt, sessionId]
    );
  }

  /**
   * Delete session
   */
  async deleteSession(sessionId) {
    await pool.query('DELETE FROM user_sessions WHERE id = $1', [sessionId]);
  }

  /**
   * Clean expired sessions
   */
  async cleanExpiredSessions() {
    await pool.query('DELETE FROM user_sessions WHERE expires_at < NOW()');
  }
}

module.exports = new AuthService();
