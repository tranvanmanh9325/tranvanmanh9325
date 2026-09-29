import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import https from 'node:https';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const README_PATH = path.resolve(ROOT_DIR, 'README.md');
const CONFIG_PATH = path.resolve(ROOT_DIR, '.markdownlint.json');

const PINNED_REPOS = [
  {
    name: 'Booking Hub Platform',
    urls: [
      'https://github.com/tranvanmanh9325/Booking-Hub-Backend',
      'https://github.com/tranvanmanh9325/Booking-Hub-Frontend'
    ]
  },
  {
    name: 'Household Registration Management System',
    urls: ['https://github.com/vuloi05/Household-Registration-Management-System']
  },
  {
    name: 'Linux Server Telemetry',
    urls: ['https://github.com/tranvanmanh9325/quan_ly_server']
  },
  {
    name: 'Hao Thanh Transport Management',
    urls: ['https://github.com/tranvanmanh9325/nha_xe_hao_thanh']
  },
  {
    name: 'Task & Productivity Tracker',
    urls: ['https://github.com/tranvanmanh9325/todolist']
  }
];

const UNPINNED_BLACKLIST = ['microservices_finish', 'leetcode'];

function checkMarkdownlint() {
  console.log('[TEST 1/5] RUNNING MARKDOWNLINT CLI CHECK');
  try {
    const cmd = `npx markdownlint-cli -c "${CONFIG_PATH}" "${README_PATH}"`;
    execSync(cmd, { stdio: 'pipe' });
    console.log('  ✅ Markdownlint passed: 0 errors, 0 warnings (Exit Code 0)\n');
    return { pass: true };
  } catch (error) {
    const stdout = error.stdout ? error.stdout.toString() : '';
    const stderr = error.stderr ? error.stderr.toString() : '';
    console.error('  ❌ Markdownlint failed:\n', stdout || stderr);
    return { pass: false };
  }
}

function extractSection(content, header) {
  const idx = content.indexOf(header);
  if (idx === -1) return '';
  const rest = content.slice(idx + header.length);
  const next = rest.search(/\n---|\n## /);
  return next === -1 ? content.slice(idx) : content.slice(idx, idx + header.length + next);
}

function parseMarkdownTable(sectionMarkdown) {
  const lines = sectionMarkdown.split('\n')
    .map(l => l.trim())
    .filter(l => l.startsWith('|') && l.endsWith('|'));
  if (lines.length < 2) return null;
  const parseRow = row => row.slice(1, -1).split('|').map(c => c.trim());
  const headers = parseRow(lines[0]);
  const rows = lines.slice(2).map(parseRow);
  return { headers, rows };
}

async function fetchHttp(url) {
  return new Promise((resolve) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      timeout: 10000
    }, (res) => {
      if ([301, 302, 307, 308].includes(res.statusCode) && res.headers.location) {
        res.resume();
        const nextUrl = new URL(res.headers.location, url).href;
        return resolve(fetchHttp(nextUrl));
      }
      res.resume();
      resolve({ url, status: res.statusCode, ok: res.statusCode === 200 });
    });
    req.on('timeout', () => { req.destroy(); resolve({ url, status: 408, ok: false }); });
    req.on('error', (err) => resolve({ url, status: 0, ok: false, error: err.message }));
  });
}

async function verifyPinnedRepoUrls() {
  console.log('[TEST 2/5] AUDITING PINNED REPOSITORY URLS & LIVE HTTP 200');
  const allUrls = PINNED_REPOS.flatMap(r => r.urls);
  let allPass = true;
  for (const url of allUrls) {
    const res = await fetchHttp(url);
    if (res.ok) {
      console.log(`  ✅ HTTP 200 OK -> ${url}`);
    } else {
      console.error(`  ❌ HTTP ${res.status} FAILED -> ${url}`);
      allPass = false;
    }
  }
  console.log();
  return { pass: allPass };
}

function verifyBlacklist(readmeContent, projSection) {
  console.log('[TEST 3/5] AUDITING UNPINNED REPO BLACKLIST (NEGATIVE CHECK)');
  let pass = true;
  for (const term of UNPINNED_BLACKLIST) {
    const inReadme = readmeContent.includes(term);
    const inProj = projSection.includes(term);
    if (inProj) {
      console.error(`  ❌ Blacklisted unpinned repo "${term}" found in Featured Projects table!`);
      pass = false;
    } else if (inReadme) {
      console.warn(`  ⚠️ Blacklisted unpinned repo "${term}" found elsewhere in README.md.`);
      pass = false;
    } else {
      console.log(`  ✅ Clean: "${term}" completely removed.`);
    }
  }
  console.log();
  return { pass };
}

function auditTableDensity(tableName, tableData, expectedHeaders) {
  console.log(`Auditing Table: "${tableName}"`);
  let tablePass = true;
  const headerMatch = expectedHeaders.every((h, i) => tableData.headers[i] === h);
  if (!headerMatch) {
    console.error(`  ❌ Header mismatch! Expected: ${JSON.stringify(expectedHeaders)}, Found: ${JSON.stringify(tableData.headers)}`);
    tablePass = false;
  } else {
    console.log(`  ✅ Headers verified: ${tableData.headers.join(' | ')}`);
  }

  tableData.rows.forEach((row, rowIdx) => {
    row.forEach((cell, colIdx) => {
      const headerName = tableData.headers[colIdx] || `Col_${colIdx}`;
      const bulletMatches = cell.match(/•|&bull;/g) || [];
      const bulletCount = bulletMatches.length;
      const charCount = cell.length;

      if (charCount > 300) {
        console.error(`  ❌ Row ${rowIdx + 1} Col "${headerName}": Length ${charCount} > 300 chars!`);
        tablePass = false;
      }
      if (bulletCount > 3) {
        console.error(`  ❌ Row ${rowIdx + 1} Col "${headerName}": Bullets ${bulletCount} > 3!`);
        tablePass = false;
      }
    });
  });

  if (tablePass) {
    console.log(`  ✅ All cells in "${tableName}" adhere strictly to: length <= 300 chars, bullets <= 3\n`);
  }
  return { pass: tablePass };
}

async function runSuite() {
  const content = fs.readFileSync(README_PATH, 'utf-8');
  const lintResult = checkMarkdownlint();
  const httpResult = await verifyPinnedRepoUrls();
  const sysSection = extractSection(content, '## System Architecture Matrix');
  const projSection = extractSection(content, '## Featured Engineering Projects');
  const blacklistResult = verifyBlacklist(content, projSection);

  console.log('[TEST 4/5] AUDITING SYSTEM ARCHITECTURE MATRIX DENSITY');
  const sysTable = parseMarkdownTable(sysSection);
  const sysResult = auditTableDensity('System Architecture Matrix', sysTable, [
    'Architecture Domain',
    'Core Stack',
    'Key Patterns',
    'Core Implementation',
    'SLA & Impact'
  ]);

  console.log('[TEST 5/5] AUDITING FEATURED ENGINEERING PROJECTS TABLE');
  const projTable = parseMarkdownTable(projSection);
  const projResult = auditTableDensity('Featured Engineering Projects', projTable, [
    'Project & Domain',
    'Architectural Highlights & System Innovations',
    'Quantified Impact & Metrics',
    'Core Tech Stack'
  ]);

  if (projTable && projTable.rows.length !== 5) {
    console.error(`  ❌ Row count mismatch: Expected 5 rows, got ${projTable.rows.length}`);
    projResult.pass = false;
  }

  const projRaw = JSON.stringify(projTable ? projTable.rows : '');
  for (const p of PINNED_REPOS) {
    for (const u of p.urls) {
      if (!projRaw.includes(u)) {
        console.error(`  ❌ Pinned repo link missing: ${u}`);
        projResult.pass = false;
      }
    }
  }

  const overall = lintResult.pass && httpResult.pass && blacklistResult.pass && sysResult.pass && projResult.pass;
  if (overall) {
    console.log('🎉 ALL CHECKS PASSED: 100% PRODUCTION READY!');
    process.exit(0);
  } else {
    console.error('❌ VERIFICATION SUITE FAILED!');
    process.exit(1);
  }
}

runSuite().catch(err => {
  console.error(err);
  process.exit(1);
});
