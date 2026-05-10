module.exports = {
  // Crawler
  CRAWLER_MAX_PAGES: parseInt(process.env.CRAWLER_MAX_PAGES || '100'),
  CRAWLER_TIMEOUT: parseInt(process.env.CRAWLER_TIMEOUT || '10000'),
  CRAWLER_DELAY: 500, // ms between requests
  
  // NLP
  RELEVANCE_THRESHOLD: parseInt(process.env.RELEVANCE_THRESHOLD || '70'),
  TOP_KEYWORDS: 10,
  MIN_KEYWORD_FREQUENCY: 2,
  
  // Link Suggestions
  MIN_ANCHOR_TEXT_LENGTH: 3,
  MAX_ANCHOR_TEXT_LENGTH: 100,
  LINKS_PER_PAGE: 5, // Max internal links to suggest per page
  
  // Stopwords for keyword extraction
  STOPWORDS: [
    'the', 'is', 'at', 'which', 'on', 'and', 'or', 'but', 'a', 'an',
    'to', 'for', 'of', 'in', 'with', 'by', 'from', 'as', 'be', 'are',
    'was', 'were', 'been', 'have', 'has', 'had', 'do', 'does', 'did',
    'can', 'could', 'should', 'would', 'may', 'might', 'must', 'will',
    'shall', 'that', 'this', 'these', 'those', 'i', 'you', 'he', 'she',
    'it', 'we', 'they', 'what', 'which', 'who', 'when', 'where', 'why',
    'how'
  ]
};
