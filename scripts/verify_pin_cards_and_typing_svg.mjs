import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const ROOT_DIR = path.resolve('.');
const README_PATH = path.resolve(ROOT_DIR, 'README.md');
const CONFIG_PATH = path.resolve(ROOT_DIR, '.markdownlint.json');

console.log('================================================================');
console.log('TEST SUITE: DYNAMIC PIN CARDS & ANIMATED ARCHITECTURE TYPING SVG');
console.log('================================================================\n');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message, details = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ [PASS] ${message}`);
  } else {
    failedTests++;
    console.error(`  ❌ [FAIL] ${message}`);
    if (details) console.error(`     Details: ${details}`);
  }
}

function extractSection(content, startHeading, endHeadingPattern = /\n---|\n## /) {
  const startIndex = content.indexOf(startHeading);
  if (startIndex === -1) return '';
  const afterStart = content.slice(startIndex + startHeading.length);
  const match = afterStart.search(endHeadingPattern);
  if (match === -1) return afterStart;
  return afterStart.slice(0, match);
}

// -------------------------------------------------------------
// 1. Markdownlint Verification
// -------------------------------------------------------------
console.log('--- TEST 1: MARKDOWNLINT COMPLIANCE ---');
try {
  const lintCmd = `npx markdownlint-cli -c "${CONFIG_PATH}" "${README_PATH}"`;
  execSync(lintCmd, { stdio: 'pipe' });
  assert(true, 'Markdownlint passed with 0 errors and 0 warnings (exit code 0)');
} catch (error) {
  const stdout = error.stdout ? error.stdout.toString() : '';
  const stderr = error.stderr ? error.stderr.toString() : '';
  assert(false, 'Markdownlint reported errors', stdout || stderr);
}

// -------------------------------------------------------------
// 2. Remote SVG Endpoints Live Verification (1 Typing SVG + 6 Pin Cards)
// -------------------------------------------------------------
console.log('\n--- TEST 2: LIVE HTTP 200 & SVG CONTENT VALIDATION (7 ENDPOINTS) ---');

const REMOTE_ENDPOINTS = [
  {
    name: 'Typing SVG Animation Banner (System Architecture)',
    url: 'https://readme-typing-svg.demolab.com?font=Fira+Code&weight=600&size=16&duration=2500&pause=1000&color=2563EB&center=true&vCenter=true&width=650&height=40&lines=High-Throughput+Virtual+Threads+%7C+50%2C000%2B+req%2Fs;Multi-Tier+Redis+L1%2FL2+Caching+%7C+Sub-2ms+Latency;Distributed+Tracing+%26+Observability+%7C+W3C+Context;Fault-Tolerant+Microservices+%7C+99.95%25+Availability',
    minSize: 5000
  },
  {
    name: 'Pin Card: Booking-Hub-Backend',
    url: 'https://github-stats-extended.vercel.app/api/pin/?username=tranvanmanh9325&repo=Booking-Hub-Backend&theme=tokyonight&show_owner=true',
    minSize: 1000
  },
  {
    name: 'Pin Card: Booking-Hub-Frontend',
    url: 'https://github-stats-extended.vercel.app/api/pin/?username=tranvanmanh9325&repo=Booking-Hub-Frontend&theme=tokyonight&show_owner=true',
    minSize: 1000
  },
  {
    name: 'Pin Card: Household-Registration-Management-System (vuloi05)',
    url: 'https://github-stats-extended.vercel.app/api/pin/?username=vuloi05&repo=Household-Registration-Management-System&theme=tokyonight&show_owner=true',
    minSize: 1000
  },
  {
    name: 'Pin Card: quan_ly_server',
    url: 'https://github-stats-extended.vercel.app/api/pin/?username=tranvanmanh9325&repo=quan_ly_server&theme=tokyonight&show_owner=true',
    minSize: 1000
  },
  {
    name: 'Pin Card: nha_xe_hao_thanh',
    url: 'https://github-stats-extended.vercel.app/api/pin/?username=tranvanmanh9325&repo=nha_xe_hao_thanh&theme=tokyonight&show_owner=true',
    minSize: 1000
  },
  {
    name: 'Pin Card: todolist',
    url: 'https://github-stats-extended.vercel.app/api/pin/?username=tranvanmanh9325&repo=todolist&theme=tokyonight&show_owner=true',
    minSize: 1000
  }
];

for (const ep of REMOTE_ENDPOINTS) {
  const t0 = Date.now();
  try {
    const res = await fetch(ep.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) VerificationSuite/1.0'
      }
    });
    const elapsed = Date.now() - t0;
    const contentType = res.headers.get('content-type') || '';
    const body = await res.text();

    const is200 = res.status === 200;
    const hasSvgTag = body.includes('<svg') && body.includes('</svg>');
    const isSvgType = contentType.includes('image/svg+xml');
    const isAdequateSize = body.length >= ep.minSize;
    const hasNoErrorMsg = !body.toLowerCase().includes('something went wrong') && !body.toLowerCase().includes('not found');

    const pass = is200 && (hasSvgTag || isSvgType) && isAdequateSize && hasNoErrorMsg;
    assert(
      pass,
      `${ep.name}: HTTP ${res.status} | ${body.length} bytes | ${elapsed}ms | SVG: ${hasSvgTag}`,
      `Status=${res.status}, Type=${contentType}, Size=${body.length} (min ${ep.minSize}), NoError=${hasNoErrorMsg}`
    );
  } catch (err) {
    assert(false, `${ep.name}: Request failed`, err.message);
  }
}

// -------------------------------------------------------------
// 3. Structural Validation of README.md (Scoped per Section)
// -------------------------------------------------------------
console.log('\n--- TEST 3: README.MD SECTION-SCOPED STRUCTURAL VALIDATION ---');
const readmeContent = fs.readFileSync(README_PATH, 'utf-8');

// Section 1: System Architecture Matrix
const archSection = extractSection(readmeContent, '## System Architecture Matrix');
assert(archSection.length > 0, 'Found section "## System Architecture Matrix"');

const archTypingUrlPart = 'lines=High-Throughput+Virtual+Threads';
const hasArchTypingSvg = archSection.includes('readme-typing-svg.demolab.com') && archSection.includes(archTypingUrlPart);
assert(hasArchTypingSvg, 'Animated Typing SVG for Architecture Matrix is present with correct lines parameter');

// Section 2: Featured Engineering Projects
const projSection = extractSection(readmeContent, '## Featured Engineering Projects');
assert(projSection.length > 0, 'Found section "## Featured Engineering Projects"');

// Check for 2-column HTML table
const hasHtmlTable = projSection.includes('<table') && projSection.includes('</table>');
assert(hasHtmlTable, 'Featured Engineering Projects uses an HTML <table> layout');

const trMatches = projSection.match(/<tr[\s>]/gi) || [];
const tdMatches = projSection.match(/<td[\s>]/gi) || [];
assert(trMatches.length === 3, `Projects table has exactly 3 rows (<tr>). Actual: ${trMatches.length}`);
assert(tdMatches.length === 6, `Projects table has exactly 6 cells (<td>). Actual: ${tdMatches.length}`);

// Check for 6 expected dynamic pin cards
const expectedRepos = [
  { owner: 'tranvanmanh9325', repo: 'Booking-Hub-Backend', name: 'Booking-Hub-Backend' },
  { owner: 'tranvanmanh9325', repo: 'Booking-Hub-Frontend', name: 'Booking-Hub-Frontend' },
  { owner: 'vuloi05', repo: 'Household-Registration-Management-System', name: 'Household-Registration-Management-System' },
  { owner: 'tranvanmanh9325', repo: 'quan_ly_server', name: 'quan_ly_server' },
  { owner: 'tranvanmanh9325', repo: 'nha_xe_hao_thanh', name: 'nha_xe_hao_thanh' },
  { owner: 'tranvanmanh9325', repo: 'todolist', name: 'todolist' }
];

let allCardsInProj = true;
for (const repoInfo of expectedRepos) {
  const cardUrlPattern = `github-stats-extended.vercel.app/api/pin/?username=${repoInfo.owner}&repo=${repoInfo.repo}&theme=tokyonight&show_owner=true`;
  const repoLinkPattern = `https://github.com/${repoInfo.owner}/${repoInfo.repo}`;
  const hasCard = projSection.includes(cardUrlPattern);
  const hasLink = projSection.includes(repoLinkPattern);
  if (!hasCard || !hasLink) {
    allCardsInProj = false;
    console.error(`     Missing card or repo link for: ${repoInfo.name} (card: ${hasCard}, link: ${hasLink})`);
  }
}
assert(allCardsInProj, 'All 6 Dynamic Pin Cards & Repository links are present in Featured Projects section');

// -------------------------------------------------------------
// 4. Negative Checks & Heading Hygiene
// -------------------------------------------------------------
console.log('\n--- TEST 4: NEGATIVE CHECKS & HYGIENE ---');
const blacklistedRepos = ['microservices_finish', 'leetcode'];
let blacklistClean = true;
for (const bad of blacklistedRepos) {
  if (readmeContent.includes(bad)) {
    blacklistClean = false;
    console.error(`     Found blacklisted unpinned repository in README: ${bad}`);
  }
}
assert(blacklistClean, 'Negative Check: Zero unpinned repositories (microservices_finish, leetcode)');

// Zero emoji in headings check
const headings = readmeContent.split('\n').filter(line => line.startsWith('#'));
const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
let headingsClean = true;
for (const h of headings) {
  if (emojiRegex.test(h)) {
    headingsClean = false;
    console.error(`     Emoji found in heading: "${h}"`);
  }
}
assert(headingsClean, 'Heading Hygiene: Zero emoji detected across all markdown headings');

console.log('\n================================================================');
console.log(`SUMMARY: ${passedTests}/${totalTests} checks passed (${failedTests} failed)`);
console.log('================================================================');

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
