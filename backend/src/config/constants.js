module.exports = {
  // Crawler
  CRAWLER_MAX_PAGES: parseInt(process.env.CRAWLER_MAX_PAGES || '100'),
  CRAWLER_TIMEOUT: parseInt(process.env.CRAWLER_TIMEOUT || '10000'),
  CRAWLER_DELAY: 500, // ms between requests
  CRAWLER_USE_SITEMAP: process.env.CRAWLER_USE_SITEMAP !== 'false',
  CRAWLER_RESPECT_ROBOTS: true,

  // NLP
  RELEVANCE_THRESHOLD: parseInt(process.env.RELEVANCE_THRESHOLD || '70'),
  TOP_KEYWORDS: 15,
  MIN_KEYWORD_FREQUENCY: 2,
  NGRAM_MIN: 2,
  NGRAM_MAX: 5,

  // Link Suggestions
  MIN_ANCHOR_TEXT_LENGTH: 3,
  MAX_ANCHOR_TEXT_LENGTH: 100,
  LINKS_PER_PAGE: 5, // Max internal links to suggest per page

  // Hybrid scoring weights (tổng = 1.0)
  SCORE_WEIGHTS: {
    semantic:   0.50, // embedding cosine
    keyword:    0.20, // TF-IDF Jaccard
    title_h1:   0.10, // overlap ở headings
    url_slug:   0.10, // slug giống nhau
    authority:  0.10, // page authority diff
  },

  // Embeddings
  EMBEDDING_MODEL: 'text-embedding-3-small',
  EMBEDDING_DIM: 1536,
  EMBEDDING_BATCH_SIZE: 100,

  // Stopwords — English + Vietnamese
  STOPWORDS: [
    // English
    'the', 'is', 'at', 'which', 'on', 'and', 'or', 'but', 'a', 'an',
    'to', 'for', 'of', 'in', 'with', 'by', 'from', 'as', 'be', 'are',
    'was', 'were', 'been', 'have', 'has', 'had', 'do', 'does', 'did',
    'can', 'could', 'should', 'would', 'may', 'might', 'must', 'will',
    'shall', 'that', 'this', 'these', 'those', 'i', 'you', 'he', 'she',
    'it', 'we', 'they', 'what', 'who', 'when', 'where', 'why', 'how',

    // Vietnamese
    'của', 'và', 'là', 'trong', 'cho', 'với', 'được', 'có', 'các',
    'những', 'một', 'này', 'đó', 'khi', 'để', 'từ', 'đã', 'sẽ', 'bị',
    'rất', 'cũng', 'như', 'về', 'tại', 'theo', 'sau', 'trước', 'nếu',
    'hoặc', 'vì', 'do', 'bởi', 'nên', 'thì', 'mà', 'hay', 'đang',
    'vẫn', 'đều', 'chỉ', 'còn', 'phải', 'nhưng', 'thêm', 'lại', 'vào',
    'ra', 'lên', 'xuống', 'qua', 'tôi', 'bạn', 'họ', 'chúng', 'mình',
    'ta', 'ai', 'gì', 'nào', 'sao', 'bao', 'mọi', 'mỗi', 'vài',
    'nhiều', 'ít', 'tất', 'cả', 'chính', 'riêng',
  ]
};
