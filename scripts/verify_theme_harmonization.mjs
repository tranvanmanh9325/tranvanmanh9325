import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const ROOT_DIR = path.resolve('.');
const README_PATH = path.resolve(ROOT_DIR, 'README.md');
const CONFIG_PATH = path.resolve(ROOT_DIR, '.markdownlint.json');

console.log('================================================================');
console.log('TEST SUITE: RATE LIMIT REMOVAL & THEME HARMONIZATION AUDIT');
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

const content = fs.readFileSync(README_PATH, 'utf-8');

// -------------------------------------------------------------
// TEST 1: Markdownlint Compliance
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
// TEST 2: Negative Audit (Zero instances of rate-limited cards)
// -------------------------------------------------------------
console.log('\n--- TEST 2: NEGATIVE AUDIT (REMOVAL OF UNSTABLE CARDS) ---');
assert(
  !content.includes('github-profile-summary-cards.vercel.app'),
  'Completely removed domain github-profile-summary-cards.vercel.app'
);
assert(!content.includes('productive-time'), 'Completely removed productive-time card');
assert(!content.includes('profile-details'), 'Completely removed profile-details card');
assert(!content.includes('repos-per-language'), 'Completely removed repos-per-language card');
assert(!content.includes('cards/stats'), 'Completely removed summary cards/stats card');

// -------------------------------------------------------------
// TEST 3: Structural & Theme Harmonization Audit
// -------------------------------------------------------------
console.log('\n--- TEST 3: STRUCTURAL & THEME AUDIT ---');

// Hero Stats fallback
assert(
  content.includes('theme=default&show_icons=true&hide_border=true" alt="GitHub Stats"'),
  'Hero Stats fallback img uses theme=default'
);

// Hero Streak fallback
assert(
  content.includes('theme=clean&hide_border=true" alt="GitHub Streak"'),
  'Hero Streak fallback img uses theme=clean'
);

// Achievements Trophies fallback
assert(
  content.includes('theme=flat&no-frame=false&no-bg=false&margin-w=4" alt="GitHub Trophies"'),
  'Achievements Trophies fallback img uses theme=flat'
);

// 6 Pin Cards verification
const PIN_REPOS = [
  'Booking-Hub-Backend',
  'Booking-Hub-Frontend',
  'Household-Registration-Management-System',
  'quan_ly_server',
  'nha_xe_hao_thanh',
  'todolist'
];

for (const repo of PIN_REPOS) {
  const hasDarkSource = content.includes(`repo=${repo}&theme=tokyonight&show_owner=true`);
  const hasLightSource = content.includes(`repo=${repo}&theme=default&show_owner=true`);
  assert(hasDarkSource, `Pin Card [${repo}] has dark source (theme=tokyonight)`);
  assert(hasLightSource, `Pin Card [${repo}] has light source & fallback (theme=default)`);
}

// Top Languages centered
assert(
  content.includes('api/top-langs/?username=tranvanmanh9325'),
  'Top Languages card is retained in analytics'
);

// -------------------------------------------------------------
// TEST 4: Live HTTP 200 & Valid SVG Validation
// -------------------------------------------------------------
console.log('\n--- TEST 4: LIVE HTTP 200 & SVG CONTENT (ALL ENDPOINTS) ---');

const ENDPOINTS_TO_VERIFY = [
  // 6 Pin Cards (tokyonight & default)
  ...PIN_REPOS.flatMap(repo => [
    {
      name: `Pin [${repo}] (tokyonight)`,
      url: `https://github-stats-extended.vercel.app/api/pin/?username=${repo === 'Household-Registration-Management-System' ? 'vuloi05' : 'tranvanmanh9325'}&repo=${repo}&theme=tokyonight&show_owner=true`
    },
    {
      name: `Pin [${repo}] (default)`,
      url: `https://github-stats-extended.vercel.app/api/pin/?username=${repo === 'Household-Registration-Management-System' ? 'vuloi05' : 'tranvanmanh9325'}&repo=${repo}&theme=default&show_owner=true`
    }
  ]),
  // Hero fallbacks
  { name: 'Hero Stats (default)', url: 'https://github-stats-extended.vercel.app/api?username=tranvanmanh9325&theme=default&show_icons=true&hide_border=true' },
  { name: 'Hero Streak (clean)', url: 'https://streak-stats.demolab.com/?user=tranvanmanh9325&theme=clean&hide_border=true' },
  // Trophies fallback
  { name: 'Trophies (flat)', url: 'https://github-trophies.vercel.app/?username=tranvanmanh9325&theme=flat&no-frame=false&no-bg=false&margin-w=4' },
  // Analytics
  { name: 'Top Languages (tokyonight)', url: 'https://github-stats-extended.vercel.app/api/top-langs/?username=tranvanmanh9325&layout=compact&langs_count=8&theme=tokyonight&hide_border=true' },
  { name: 'Top Languages (default)', url: 'https://github-stats-extended.vercel.app/api/top-langs/?username=tranvanmanh9325&layout=compact&langs_count=8&theme=default&hide_border=true' }
];

for (const ep of ENDPOINTS_TO_VERIFY) {
  try {
    const res = await fetch(ep.url, { headers: { 'User-Agent': 'Mozilla/5.0 VerificationSuite/2.0' } });
    const text = await res.text();
    const isSvg = text.includes('<svg');
    const is200 = res.status === 200;
    assert(is200 && isSvg, `${ep.name} -> HTTP ${res.status}, SVG: ${isSvg}, Size: ${text.length}B`);
  } catch (err) {
    assert(false, `${ep.name} fetch failed`, err.message);
  }
}

// -------------------------------------------------------------
// SUMMARY
// -------------------------------------------------------------
console.log('\n================================================================');
console.log(`TOTAL TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${failedTests}`);
console.log('================================================================\n');

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log('🎉 ALL AUDIT CHECKS PASSED PERFECTLY!\n');
  process.exit(0);
}
