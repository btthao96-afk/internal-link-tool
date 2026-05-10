-- Web App Database Schema
-- Multi-user internal link SEO tool

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  company VARCHAR(255),
  website VARCHAR(255),
  plan VARCHAR(50) DEFAULT 'free', -- free, pro, enterprise
  is_active BOOLEAN DEFAULT TRUE,
  email_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User sessions (for JWT refresh tokens)
CREATE TABLE IF NOT EXISTS user_sessions (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Projects (user's websites)
CREATE TABLE IF NOT EXISTS projects (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  website_url VARCHAR(500) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'pending', -- pending, crawling, analyzing, completed, failed
  crawl_settings JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_crawled_at TIMESTAMP,
  UNIQUE(user_id, website_url)
);

-- Pages (crawled pages for each project)
CREATE TABLE IF NOT EXISTS pages (
  id SERIAL PRIMARY KEY,
  project_id INT REFERENCES projects(id) ON DELETE CASCADE,
  url VARCHAR(500) NOT NULL,
  title VARCHAR(300),
  h1 TEXT,
  meta_desc VARCHAR(160),
  content TEXT,
  word_count INT,
  status VARCHAR(20) DEFAULT 'pending', -- pending, crawled, analyzed
  crawled_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(project_id, url)
);

-- Keywords (extracted from each page)
CREATE TABLE IF NOT EXISTS keywords (
  id SERIAL PRIMARY KEY,
  page_id INT REFERENCES pages(id) ON DELETE CASCADE,
  keyword VARCHAR(100),
  frequency INT,
  tf_idf_score FLOAT,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(page_id, keyword)
);

-- Relationships between pages (based on keyword/semantic similarity)
CREATE TABLE IF NOT EXISTS relationships (
  id SERIAL PRIMARY KEY,
  project_id INT REFERENCES projects(id) ON DELETE CASCADE,
  from_page_id INT REFERENCES pages(id) ON DELETE CASCADE,
  to_page_id INT REFERENCES pages(id) ON DELETE CASCADE,
  relevance_score FLOAT,
  reason VARCHAR(100), -- "keyword_overlap", "semantic", "topical_cluster"
  shared_keywords TEXT[], -- array of keywords that match
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(project_id, from_page_id, to_page_id)
);

-- Internal link suggestions
CREATE TABLE IF NOT EXISTS suggestions (
  id SERIAL PRIMARY KEY,
  project_id INT REFERENCES projects(id) ON DELETE CASCADE,
  from_page_id INT REFERENCES pages(id) ON DELETE CASCADE,
  to_page_id INT REFERENCES pages(id) ON DELETE CASCADE,
  anchor_text VARCHAR(200),
  suggested_paragraph INT, -- which paragraph number
  suggested_context TEXT, -- context around where link should go
  relevance_score FLOAT,
  link_type VARCHAR(50), -- "related", "topical", "pillar", "supporting"
  status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected, implemented
  user_feedback VARCHAR(255), -- why user approved/rejected
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  approved_at TIMESTAMP,
  UNIQUE(project_id, from_page_id, to_page_id, anchor_text)
);

-- Implemented links (audit trail)
CREATE TABLE IF NOT EXISTS implemented_links (
  id SERIAL PRIMARY KEY,
  project_id INT REFERENCES projects(id) ON DELETE CASCADE,
  suggestion_id INT REFERENCES suggestions(id),
  from_page_url VARCHAR(500),
  to_page_url VARCHAR(500),
  anchor_text VARCHAR(200),
  implementation_method VARCHAR(50), -- "manual", "api", "cms"
  implemented_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  verified_at TIMESTAMP
);

-- Crawl sessions (track crawl runs)
CREATE TABLE IF NOT EXISTS crawl_sessions (
  id SERIAL PRIMARY KEY,
  project_id INT REFERENCES projects(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'in_progress', -- in_progress, completed, failed
  total_pages INT,
  pages_crawled INT DEFAULT 0,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP,
  error_message TEXT
);

-- Analytics table (per project)
CREATE TABLE IF NOT EXISTS analytics (
  id SERIAL PRIMARY KEY,
  project_id INT REFERENCES projects(id) ON DELETE CASCADE,
  metric_name VARCHAR(100),
  metric_value FLOAT,
  metric_date DATE DEFAULT CURRENT_DATE,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(project_id, metric_name, metric_date)
);

-- User usage tracking
CREATE TABLE IF NOT EXISTS usage_logs (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  action VARCHAR(100), -- "crawl", "analyze", "generate_suggestions", etc.
  project_id INT REFERENCES projects(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_pages_project_id ON pages(project_id);
CREATE INDEX IF NOT EXISTS idx_pages_status ON pages(status);
CREATE INDEX IF NOT EXISTS idx_pages_url ON pages(url);
CREATE INDEX IF NOT EXISTS idx_keywords_page_id ON keywords(page_id);
CREATE INDEX IF NOT EXISTS idx_keywords_keyword ON keywords(keyword);
CREATE INDEX IF NOT EXISTS idx_relationships_project_id ON relationships(project_id);
CREATE INDEX IF NOT EXISTS idx_relationships_from_page ON relationships(from_page_id);
CREATE INDEX IF NOT EXISTS idx_relationships_to_page ON relationships(to_page_id);
CREATE INDEX IF NOT EXISTS idx_relationships_score ON relationships(relevance_score DESC);
CREATE INDEX IF NOT EXISTS idx_suggestions_project_id ON suggestions(project_id);
CREATE INDEX IF NOT EXISTS idx_suggestions_status ON suggestions(status);
CREATE INDEX IF NOT EXISTS idx_suggestions_from_page ON suggestions(from_page_id);
CREATE INDEX IF NOT EXISTS idx_suggestions_score ON suggestions(relevance_score DESC);
CREATE INDEX IF NOT EXISTS idx_usage_logs_user_id ON usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_created_at ON usage_logs(created_at DESC);

-- Insert default admin user (password: admin123)
-- Password hash for 'admin123': $2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi
INSERT INTO users (email, password_hash, first_name, last_name, plan, is_active, email_verified)
VALUES ('admin@internallinktool.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Admin', 'User', 'enterprise', true, true)
ON CONFLICT (email) DO NOTHING;
