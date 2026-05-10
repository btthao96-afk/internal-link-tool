const axios = require('axios');
const cheerio = require('cheerio');
const { URL } = require('url');
const { bulkInsertPages } = require('../db/projectQueries');
const CONST = require('../config/constants');

class ProjectCrawler {
  constructor(projectId, startUrl, options = {}) {
    this.projectId = projectId;
    this.startUrl = startUrl;
    this.maxPages = options.maxPages || CONST.CRAWLER_MAX_PAGES;
    this.visited = new Set();
    this.queue = [];
    this.pages = [];
    this.userId = options.userId;

    const urlObj = new URL(startUrl);
    this.domain = urlObj.hostname;
  }

  /**
   * Start crawling the website for a project
   */
  async crawl() {
    console.log(`Starting crawl for project ${this.projectId}: ${this.startUrl}`);
    this.queue.push(this.startUrl);

    let crawledCount = 0;

    while (this.queue.length > 0 && crawledCount < this.maxPages) {
      const url = this.queue.shift();

      if (this.visited.has(url)) continue;

      try {
        console.log(`[${crawledCount + 1}/${this.maxPages}] Crawling: ${url}`);

        const pageData = await this.crawlPage(url);

        if (pageData) {
          this.pages.push(pageData);
          crawledCount++;

          // Add new URLs to queue
          this.extractLinks(pageData.content, url).forEach(link => {
            if (!this.visited.has(link)) {
              this.queue.push(link);
            }
          });
        }

        this.visited.add(url);

        // Add delay between requests to be respectful
        await this.delay(CONST.CRAWLER_DELAY);

      } catch (error) {
        console.error(`Error crawling ${url}:`, error.message);
        this.visited.add(url);
      }
    }

    // Bulk insert pages to database
    if (this.pages.length > 0) {
      await bulkInsertPages(this.projectId, this.pages);
    }

    console.log(`\nCrawl completed for project ${this.projectId}. Total pages: ${this.pages.length}`);
    return this.pages;
  }

  /**
   * Crawl individual page
   */
  async crawlPage(url) {
    try {
      const response = await axios.get(url, {
        timeout: CONST.CRAWLER_TIMEOUT,
        headers: {
          'User-Agent': 'Internal Link Tool/1.0 (SEO Analysis Bot)'
        }
      });

      const $ = cheerio.load(response.data);

      const data = {
        url: url,
        title: $('title').text().trim(),
        h1: $('h1').first().text().trim(),
        meta_desc: $('meta[name="description"]').attr('content') || '',
        content: $('body').text().trim(),
        word_count: ($('body').text() || '').split(/\s+/).length,
        headers: {
          h1: $('h1').text().trim(),
          h2: $('h2').map((i, el) => $(el).text()).get(),
          h3: $('h3').map((i, el) => $(el).text()).get()
        }
      };

      return data;

    } catch (error) {
      console.error(`Failed to crawl ${url}:`, error.message);
      return null;
    }
  }

  /**
   * Extract links from page content
   */
  extractLinks(htmlContent, pageUrl) {
    const $ = cheerio.load(htmlContent);
    const links = [];

    $('a[href]').each((_, element) => {
      const href = $(element).attr('href');
      if (!href) return;

      try {
        // Convert relative URLs to absolute
        const absoluteUrl = new URL(href, pageUrl).href;
        const urlObj = new URL(absoluteUrl);

        // Only crawl same domain
        if (urlObj.hostname === this.domain) {
          // Remove hash and query params for consistency
          const cleanUrl = `${urlObj.protocol}//${urlObj.hostname}${urlObj.pathname}`;

          if (!links.includes(cleanUrl)) {
            links.push(cleanUrl);
          }
        }
      } catch (error) {
        // Invalid URL, skip
      }
    });

    return links;
  }

  /**
   * Utility: delay between requests
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = ProjectCrawler;
