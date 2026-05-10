-- Create database
-- Note: Run this separately first
-- CREATE DATABASE internal_link_tool;

-- Pages table
CREATE TABLE IF NOT EXISTS pages (
  id SERIAL PRIMARY KEY,
  url VARCHAR(500) UNIQUE NOT NULL,
  title VARCHAR(300),
  h1 TEXT,
  meta_desc VARCHAR(160),
  content TEXT,
  word_count INT,
  status VARCHAR(20) DEFAULT 'pending', -- pending, crawled, analyzed
  crawled_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Keywords table (extracted from each page)
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
  from_page_id INT REFERENCES pages(id) ON DELETE CASCADE,
  to_page_id INT REFERENCES pages(id) ON DELETE CASCADE,
  relevance_score FLOAT,
  reason VARCHAR(100), -- "keyword_overlap", "semantic", "topical_cluster"
  shared_keywords TEXT[], -- array of keywords that match
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(from_page_id, to_page_id)
);

-- Internal link suggestions
CREATE TABLE IF NOT EXISTS suggestions (
  id SERIAL PRIMARY KEY,
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
  UNIQUE(from_page_id, to_page_id, anchor_text)
);

-- Implemented links (audit trail)
CREATE TABLE IF NOT EXISTS implemented_links (
  id SERIAL PRIMARY KEY,
  suggestion_id INT REFERENCES suggestions(id),
  from_page_url VARCHAR(500),
  to_page_url VARCHAR(500),
  anchor_text VARCHAR(200),
  implementation_method VARCHAR(50), -- "api", "manual", "cms"
  implemented_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  verified_at TIMESTAMP
);

-- Crawl sessions (track crawl runs)
CREATE TABLE IF NOT EXISTS crawl_sessions (
  id SERIAL PRIMARY KEY,
  website_url VARCHAR(500),
  status VARCHAR(20) DEFAULT 'in_progress', -- in_progress, completed, failed
  total_pages INT,
  pages_crawled INT DEFAULT 0,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP,
  error_message TEXT
);

-- Analytics table
CREATE TABLE IF NOT EXISTS analytics (
  id SERIAL PRIMARY KEY,
  metric_name VARCHAR(100),
  metric_value FLOAT,
  metric_date DATE DEFAULT CURRENT_DATE,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(metric_name, metric_date)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_pages_status ON pages(status);
CREATE INDEX IF NOT EXISTS idx_pages_url ON pages(url);
CREATE INDEX IF NOT EXISTS idx_keywords_page_id ON keywords(page_id);
CREATE INDEX IF NOT EXISTS idx_keywords_keyword ON keywords(keyword);
CREATE INDEX IF NOT EXISTS idx_relationships_from_page ON relationships(from_page_id);
CREATE INDEX IF NOT EXISTS idx_relationships_to_page ON relationships(to_page_id);
CREATE INDEX IF NOT EXISTS idx_relationships_score ON relationships(relevance_score DESC);
CREATE INDEX IF NOT EXISTS idx_suggestions_status ON suggestions(status);
CREATE INDEX IF NOT EXISTS idx_suggestions_from_page ON suggestions(from_page_id);
CREATE INDEX IF NOT EXISTS idx_suggestions_score ON suggestions(relevance_score DESC);
