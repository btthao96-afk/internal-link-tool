/**
 * Test script: chứng minh tokenizer mới hỗ trợ tiếng Việt
 *
 * Chạy: node scripts/test-vietnamese-tokenizer.js
 *
 * Không cần database — test thuần logic NLP.
 */

const CONST = require('../src/config/constants');

// ────────────────────────────────────────────────────────────────
// Mô phỏng tokenizer CŨ (regex ASCII-only) để so sánh
// ────────────────────────────────────────────────────────────────
const natural = require('natural');
const oldTokenizer = new natural.WordTokenizer();
const oldStopwords = new Set([
  'the','is','at','which','on','and','or','but','a','an','to','for','of'
]);

function tokenizeOld(text) {
  const tokens = oldTokenizer.tokenize((text || '').toLowerCase());
  return tokens.filter(token =>
    !oldStopwords.has(token) &&
    token.length > 2 &&
    /^[a-z0-9]+$/.test(token)        // ← regex ASCII-only (BUG)
  );
}

// ────────────────────────────────────────────────────────────────
// Tokenizer MỚI từ nlp.js
// ────────────────────────────────────────────────────────────────
const nlp = require('../src/services/nlp');

// ────────────────────────────────────────────────────────────────
// Test cases — content thật từ trang theone.vn
// ────────────────────────────────────────────────────────────────
const samples = [
  {
    label: 'Bàn ghế văn phòng (theone.vn)',
    text: `Ghế văn phòng The One với thiết kế tựa đầu hiện đại GL363.
Bàn ghế lưới văn phòng cao cấp, thoáng khí, tốt cho cột sống.
Nội thất văn phòng The One mang đến sự thoải mái cho người dùng.`
  },
  {
    label: 'Mô tả sản phẩm tiếng Việt',
    text: `Sofa phòng khách hiện đại được làm từ chất liệu cao cấp.
Bộ sofa nỉ êm ái, sang trọng cho không gian phòng khách của bạn.
Thiết kế tinh tế phù hợp với nhiều phong cách nội thất.`
  },
  {
    label: 'Mixed Vietnamese + English',
    text: `The One website provides quality nội thất văn phòng products.
Browse our catalog of bàn làm việc, ghế xoay, and modern sofa.`
  }
];

// ────────────────────────────────────────────────────────────────
// Run comparison
// ────────────────────────────────────────────────────────────────
console.log('═'.repeat(72));
console.log('   TEST: Vietnamese Tokenizer (Before vs After Fix)');
console.log('═'.repeat(72));

samples.forEach((sample, i) => {
  console.log(`\n[Test ${i + 1}] ${sample.label}`);
  console.log('─'.repeat(72));
  console.log('Input:');
  sample.text.split('\n').forEach(line => console.log('  ' + line.trim()));

  const oldTokens = tokenizeOld(sample.text);
  const newTokens = nlp.tokenize(sample.text);

  console.log(`\n❌ CŨ (regex /^[a-z0-9]+$/) → ${oldTokens.length} tokens:`);
  console.log('  ' + (oldTokens.length ? oldTokens.join(', ') : '(rỗng)'));

  console.log(`\n✅ MỚI (regex /^[\\p{L}\\p{N}]+$/u) → ${newTokens.length} tokens:`);
  console.log('  ' + newTokens.join(', '));

  const recovered = newTokens.length - oldTokens.length;
  console.log(`\n📊 Cải thiện: +${recovered} từ tiếng Việt được giữ lại`);
});

// ────────────────────────────────────────────────────────────────
// Test TF-IDF
// ────────────────────────────────────────────────────────────────
console.log('\n' + '═'.repeat(72));
console.log('   TEST: TF-IDF (corpus 3 page)');
console.log('═'.repeat(72));

const corpus = samples.map(s => nlp.tokenize(s.text));
const docFreq = nlp.calculateDocFrequency(corpus);
const N = corpus.length;

samples.forEach((sample, i) => {
  const tf = nlp.calculateFrequency(corpus[i]);
  const top = nlp.scoreKeywordsTfIdf(tf, docFreq, N).slice(0, 5);
  console.log(`\nPage ${i + 1} (${sample.label}) — Top 5 keywords:`);
  top.forEach(k => {
    console.log(`  ${k.keyword.padEnd(20)} freq=${k.frequency}  tfidf=${k.tfidf.toFixed(3)}`);
  });
});

// ────────────────────────────────────────────────────────────────
// Test n-gram extraction (cho anchor text)
// ────────────────────────────────────────────────────────────────
console.log('\n' + '═'.repeat(72));
console.log('   TEST: N-gram extraction (anchor text candidates)');
console.log('═'.repeat(72));

const ngramSample = 'Bàn ghế văn phòng cao cấp the one nội thất hiện đại';
console.log(`Input: "${ngramSample}"`);

[2, 3].forEach(n => {
  const ngrams = nlp.extractNgrams(ngramSample, n);
  console.log(`\n  ${n}-gram (${ngrams.length} cụm):`);
  ngrams.forEach(g => console.log(`    "${g}"`));
});

// ────────────────────────────────────────────────────────────────
// Test similarity giữa 2 page tiếng Việt
// ────────────────────────────────────────────────────────────────
console.log('\n' + '═'.repeat(72));
console.log('   TEST: Similarity giữa Page 1 ↔ Page 2');
console.log('═'.repeat(72));

const kw1 = nlp.extractKeywords(samples[0].text);
const kw2 = nlp.extractKeywords(samples[1].text);
const sim = nlp.calculateSimilarity(kw1, kw2);

console.log(`\nPage 1 keywords: ${kw1.map(k => k.keyword).join(', ')}`);
console.log(`Page 2 keywords: ${kw2.map(k => k.keyword).join(', ')}`);
console.log(`\nJaccard similarity: ${sim.similarity}%`);
console.log(`Shared keywords:    ${sim.shared.join(', ') || '(none)'}`);

console.log('\n' + '═'.repeat(72));
console.log('   ✅ ALL TESTS DONE');
console.log('═'.repeat(72));
