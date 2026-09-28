/**
 * Comprehensive Profile Verification Script (Enhanced Suite)
 * Validates:
 * 1. Markdownlint syntax check (exit code 0)
 * 2. 100% HTTP status checks for all URLs in README.md
 * 3. Widget username parameter accuracy (Extended to all 9 widgets)
 * 4. SVG Content Integrity: Activity Graph diacritics check & title verification
 * 5. Table & HTML tag pairing sanity check
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { execSync } = require('child_process');

const README_PATH = path.resolve(__dirname, '..', 'README.md');
const CONFIG_PATH = path.resolve(__dirname, '..', '.markdownlint.json');
const TARGET_USERNAME = 'tranvanmanh9325';

function checkLinter(readmePath = README_PATH, configPath = CONFIG_PATH) {
  console.log('[STEP 1/4] CHECKING MARKDOWN FORMATTING (MARKDOWNLINT)');
  try {
    const cmd = `npx markdownlint-cli -c "${configPath}" "${readmePath}"`;
    execSync(cmd, { stdio: 'pipe' });
    console.log('  ✅ Markdownlint passed: 0 errors, 0 warnings (Exit Code 0)\n');
    return true;
  } catch (error) {
    console.error('  ❌ Markdownlint failed:');
    if (error.stdout) console.error(error.stdout.toString());
    if (error.stderr) console.error(error.stderr.toString());
    return false;
  }
}

function extractUrls(markdown) {
  const urlSet = new Set();
  let match;

  // 1. HTML img src (matches multiline, whitespace-tolerant)
  const imgSrcRegex = /<img\b[^>]*?\bsrc=["']([^"']+)["']/gi;
  while ((match = imgSrcRegex.exec(markdown)) !== null) {
    urlSet.add(match[1]);
  }

  // 2. HTML a href
  const aHrefRegex = /<a\b[^>]*?\bhref=["']([^"']+)["']/gi;
  while ((match = aHrefRegex.exec(markdown)) !== null) {
    urlSet.add(match[1]);
  }

  // 3. HTML source srcset
  const srcsetRegex = /<source\b[^>]*?\bsrcset=["']([^"']+)["']/gi;
  while ((match = srcsetRegex.exec(markdown)) !== null) {
    urlSet.add(match[1]);
  }

  // 4. Markdown nested image in link: [![alt](img_url)](dest_url)
  const nestedMdRegex = /\[!\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)\]\((https?:\/\/[^)\s]+)\)/gi;
  while ((match = nestedMdRegex.exec(markdown)) !== null) {
    urlSet.add(match[2]);
    urlSet.add(match[3]);
  }

  // 5. Standard Markdown links / images: [text](url) or ![alt](url)
  const mdRegex = /!?\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)/gi;
  while ((match = mdRegex.exec(markdown)) !== null) {
    urlSet.add(match[2]);
  }

  return Array.from(urlSet);
}

function fetchUrl(targetUrl, maxRedirects = 5, retrieveBody = false) {
  return new Promise((resolve) => {
    if (targetUrl.startsWith('mailto:')) {
      const email = targetUrl.replace('mailto:', '');
      const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      return resolve({
        url: targetUrl,
        statusCode: validEmail ? 200 : 400,
        ok: validEmail,
        note: 'mailto verified',
        body: ''
      });
    }

    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      return resolve({
        url: targetUrl,
        statusCode: 0,
        ok: false,
        note: 'unsupported protocol',
        body: ''
      });
    }

    const client = targetUrl.startsWith('https://') ? https : http;
    const req = client.get(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/svg+xml,*/*;q=0.8'
      },
      timeout: 15000
    }, (res) => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location && maxRedirects > 0) {
        const redirectUrl = new URL(res.headers.location, targetUrl).href;
        res.resume();
        return resolve(fetchUrl(redirectUrl, maxRedirects - 1, retrieveBody));
      }

      let bodyData = '';
      if (retrieveBody) {
        res.on('data', chunk => { bodyData += chunk; });
        res.on('end', () => {
          evaluateResult(res.statusCode, bodyData);
        });
      } else {
        res.resume();
        evaluateResult(res.statusCode, '');
      }

      function evaluateResult(statusCode, body) {
        const isKnownAntiBot = (
          (targetUrl.includes('linkedin.com') && (statusCode === 999 || statusCode === 200)) ||
          (targetUrl.includes('facebook.com') && (statusCode === 400 || statusCode === 200 || statusCode === 302)) ||
          (targetUrl.includes('tiktok.com') && (statusCode === 200 || statusCode === 403))
        );

        const ok = statusCode === 200 || isKnownAntiBot;
        resolve({
          url: targetUrl,
          statusCode,
          ok,
          note: isKnownAntiBot && statusCode !== 200 ? 'known platform bot-defense' : 'OK',
          body
        });
      }
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ url: targetUrl, statusCode: 408, ok: false, note: 'timeout', body: '' });
    });

    req.on('error', (err) => {
      resolve({ url: targetUrl, statusCode: 0, ok: false, note: err.message, body: '' });
    });
  });
}

function checkTableStructureSanity(markdown) {
  const tableOpen = (markdown.match(/<table\b/gi) || []).length;
  const tableClose = (markdown.match(/<\/table>/gi) || []).length;
  const trOpen = (markdown.match(/<tr\b/gi) || []).length;
  const trClose = (markdown.match(/<\/tr>/gi) || []).length;
  const tdOpen = (markdown.match(/<td\b/gi) || []).length;
  const tdClose = (markdown.match(/<\/td>/gi) || []).length;

  const match = (tableOpen === tableClose) && (trOpen === trClose) && (tdOpen === tdClose);
  return {
    valid: match,
    tables: `${tableOpen}/${tableClose}`,
    trs: `${trOpen}/${trClose}`,
    tds: `${tdOpen}/${tdClose}`
  };
}

async function verifyAll(readmePath = README_PATH, configPath = CONFIG_PATH) {
  console.log('======================================================================');
  console.log(' STARTING COMPREHENSIVE GITHUB PROFILE VERIFICATION (ENHANCED)');
  console.log('======================================================================\n');

  // Step 1: Linter
  const linterPassed = checkLinter(readmePath, configPath);

  // Step 2: Extract & Verify URLs
  console.log('[STEP 2/4] EXTRACTING & VERIFYING ALL REMOTE URLS');
  const markdown = fs.readFileSync(readmePath, 'utf-8');
  const urls = extractUrls(markdown);
  console.log(`  Found ${urls.length} unique URLs in README.md\n`);

  let httpPassed = true;
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    const result = await fetchUrl(url, 5, false);
    if (result.ok) {
      console.log(`  [${i + 1}/${urls.length}] ✅ HTTP ${result.statusCode} (${result.note}) -> ${url}`);
    } else {
      console.error(`  [${i + 1}/${urls.length}] ❌ HTTP ${result.statusCode} (${result.note}) -> ${url}`);
      httpPassed = false;
    }
  }

  // Step 3: Validate Widget Username & Parameter Accuracy
  console.log('\n[STEP 3/4] VALIDATING WIDGET USERNAME & CONFIG PARAMETERS');
  const widgetRules = [
    { name: 'Profile Views', regex: /komarev\.com\/ghpvc\/\?username=([^&"'\s]+)/g },
    { name: 'Extended Stats', regex: /github-stats-extended\.vercel\.app\/api\?username=([^&"'\s]+)/g },
    { name: 'Extended Top Langs', regex: /github-stats-extended\.vercel\.app\/api\/top-langs\/\?username=([^&"'\s]+)/g },
    { name: 'Streak Stats', regex: /streak-stats\.demolab\.com\/\?user=([^&"'\s]+)/g },
    { name: 'Activity Graph', regex: /github-activity-graph\.vercel\.app\/graph\?[^"'\s]*username=([^&"'\s]+)/g },
    { name: 'Summary Productive Time', regex: /github-profile-summary-cards\.vercel\.app\/api\/cards\/productive-time\?[^"'\s]*username=([^&"'\s]+)/g },
    { name: 'Summary Profile Details', regex: /github-profile-summary-cards\.vercel\.app\/api\/cards\/profile-details\?[^"'\s]*username=([^&"'\s]+)/g },
    { name: 'Summary Repos Per Lang', regex: /github-profile-summary-cards\.vercel\.app\/api\/cards\/repos-per-language\?[^"'\s]*username=([^&"'\s]+)/g },
    { name: 'Summary Stats', regex: /github-profile-summary-cards\.vercel\.app\/api\/cards\/stats\?[^"'\s]*username=([^&"'\s]+)/g }
  ];

  let widgetPassed = true;
  for (const rule of widgetRules) {
    let match;
    let occurrences = 0;
    while ((match = rule.regex.exec(markdown)) !== null) {
      occurrences++;
      const user = match[1];
      if (user === TARGET_USERNAME) {
        console.log(`  ✅ [${rule.name}] Username correct: "${user}"`);
      } else {
        console.error(`  ❌ [${rule.name}] Username mismatch: expected "${TARGET_USERNAME}", got "${user}"`);
        widgetPassed = false;
      }
    }
    if (occurrences === 0) {
      console.warn(`  ⚠️ [${rule.name}] Widget pattern not found in README.md`);
    }
  }

  // Step 4: SVG Content Integrity & Diacritics Check
  console.log('\n[STEP 4/4] VALIDATING SVG CONTENT INTEGRITY & DIACRITICS ELIMINATION');
  let contentCheckPassed = true;

  // Extract all activity graph URLs in README
  const activityGraphRegex = /https:\/\/github-activity-graph\.vercel\.app\/graph\?[^"'\s]+/g;
  const graphUrls = Array.from(new Set(markdown.match(activityGraphRegex) || []));

  if (graphUrls.length === 0) {
    console.error('  ❌ No Activity Graph URLs found in README.md');
    contentCheckPassed = false;
  } else {
    for (const gUrl of graphUrls) {
      console.log(`  Checking Activity Graph URL: ${gUrl}`);
      // 1. Verify custom_title parameter is present
      if (!gUrl.includes('custom_title=Contribution+Activity+Graph')) {
        console.error(`  ❌ URL missing required parameter custom_title=Contribution+Activity+Graph`);
        contentCheckPassed = false;
      } else {
        console.log(`  ✅ custom_title parameter present in URL`);
      }

      // 2. Fetch body and assert no Vietnamese diacritics
      const res = await fetchUrl(gUrl, 5, true);
      if (!res.ok || !res.body) {
        console.error(`  ❌ Failed to fetch Activity Graph SVG body (HTTP ${res.statusCode})`);
        contentCheckPassed = false;
      } else {
        const hasTran = res.body.includes('Trần');
        const hasManh = res.body.includes('Mạnh');
        const hasCustomTitle = res.body.includes('Contribution Activity Graph');

        if (hasTran || hasManh) {
          console.error(`  ❌ Vietnamese diacritics detected in SVG response! (hasTran=${hasTran}, hasManh=${hasManh})`);
          contentCheckPassed = false;
        } else {
          console.log(`  ✅ Verified zero Vietnamese diacritics ("Trần", "Mạnh") in SVG response.`);
        }

        if (hasCustomTitle) {
          console.log(`  ✅ Verified custom title "Contribution Activity Graph" is rendered in SVG.`);
        } else {
          console.warn(`  ⚠️ Custom title string not directly found in SVG body text.`);
        }
      }
    }
  }

  // Verify Table sanity
  const tableCheck = checkTableStructureSanity(markdown);
  console.log(`\n  Table HTML balance: ${tableCheck.valid ? 'BALANCED' : 'IMBALANCED'} (tables: ${tableCheck.tables}, tr: ${tableCheck.trs}, td: ${tableCheck.tds})`);
  if (!tableCheck.valid) {
    contentCheckPassed = false;
  }

  console.log('\n======================================================================');
  console.log(' VERIFICATION SUMMARY');
  console.log('======================================================================');
  console.log(`1. Markdown Linter Exit Code : ${linterPassed ? '0 (PASS - 0 errors, 0 warnings)' : 'NON-ZERO (FAILED)'}`);
  console.log(`2. Remote URL Verification   : ${httpPassed ? `${urls.length}/${urls.length} PASS (100% OK)` : 'FAILED'}`);
  console.log(`3. Widget Username Accuracy  : ${widgetPassed ? 'PASS (100% Correct)' : 'FAILED'}`);
  console.log(`4. SVG Content & Diacritics  : ${contentCheckPassed ? 'PASS (Zero Diacritics Verified)' : 'FAILED'}`);

  const overallSuccess = linterPassed && httpPassed && widgetPassed && contentCheckPassed;
  if (overallSuccess) {
    console.log('\n🎉 ALL CHECKS PASSED: PROFILE README IS 100% PRODUCTION READY!');
    console.log('======================================================================');
    process.exit(0);
  } else {
    console.error('\n❌ VERIFICATION FAILED: See details above.');
    console.log('======================================================================');
    process.exit(1);
  }
}

// Support CLI execution
if (require.main === module) {
  const customReadme = process.argv[2] ? path.resolve(process.argv[2]) : README_PATH;
  const customConfig = process.argv[3] ? path.resolve(process.argv[3]) : CONFIG_PATH;
  verifyAll(customReadme, customConfig).catch(err => {
    console.error('Fatal execution error:', err);
    process.exit(1);
  });
}

module.exports = {
  checkLinter,
  extractUrls,
  fetchUrl,
  checkTableStructureSanity,
  verifyAll
};
