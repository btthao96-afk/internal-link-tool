#!/usr/bin/env node

/**
 * CLI script to run the entire workflow
 * Usage:
 *   node scripts/workflow.js <website-url> [max-pages]
 * Example:
 *   node scripts/workflow.js https://example.com 50
 */

const Crawler = require('../src/services/crawler');
const nlp = require('../src/services/nlp');
const relevanceEngine = require('../src/services/relevanceEngine');
const suggestionGenerator = require('../src/services/suggestionGenerator');
const db = require('../src/db/queries');

async function runWorkflow(startUrl, maxPages = 50) {
  try {
    console.log('\n' + '='.repeat(60));
    console.log('INTERNAL LINK TOOL - WORKFLOW');
    console.log('='.repeat(60));
    
    // Step 1: Crawl website
    console.log('\n📍 STEP 1: Crawling website...');
    const crawler = new Crawler(startUrl, { maxPages });
    const pages = await crawler.crawl();
    
    console.log(`✅ Crawled ${pages.length} pages`);
    
    // Step 2: Process NLP
    console.log('\n📍 STEP 2: Processing NLP and extracting keywords...');
    await nlp.processAllPages();
    console.log('✅ NLP processing complete');
    
    // Step 3: Build relationships
    console.log('\n📍 STEP 3: Building page relationship graph...');
    await relevanceEngine.buildRelationshipGraph();
    console.log('✅ Relationship graph built');
    
    // Step 4: Generate suggestions
    console.log('\n📍 STEP 4: Generating internal link suggestions...');
    const stats = await suggestionGenerator.generateSuggestionsWithStats();
    
    // Step 5: Show results
    console.log('\n' + '='.repeat(60));
    console.log('WORKFLOW COMPLETE! 🎉');
    console.log('='.repeat(60));
    console.log('\nSummary:');
    console.log(`- Pages crawled: ${stats.total_pages}`);
    console.log(`- Pages analyzed: ${stats.crawled_pages}`);
    console.log(`- Keywords extracted: ${stats.total_keywords}`);
    console.log(`- Relationships found: ${stats.total_relationships}`);
    console.log(`- Suggestions created: ${stats.pending_suggestions}`);
    
    console.log('\nNext steps:');
    console.log('1. Start the server: npm start');
    console.log('2. Open dashboard: http://localhost:3001');
    console.log('3. Review and approve suggestions');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Get arguments
const args = process.argv.slice(2);
if (args.length === 0) {
  console.log('Usage: node scripts/workflow.js <website-url> [max-pages]');
  console.log('Example: node scripts/workflow.js https://example.com 50');
  process.exit(1);
}

const startUrl = args[0];
const maxPages = parseInt(args[1]) || 50;

runWorkflow(startUrl, maxPages);
