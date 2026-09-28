/**
 * Verification script for Skill Icons Composite SVG Payloads
 * Verifies that each skillicons.dev composite endpoint returns complete multi-icon SVGs
 * and not truncated single-icon responses caused by HTML5 srcset parsing errors.
 */

const https = require('https');

const EXPECTED_SPECS = [
  {
    name: 'Backend & Distributed Systems',
    url: 'https://skillicons.dev/icons?i=java,spring,postgres,mysql,redis',
    expectedIcons: 5,
    expectedWidth: '273',
    expectedHeight: '48',
    expectedViewBox: '0 0 1456 256',
    expectedTranslates: [0, 300, 600, 900, 1200]
  },
  {
    name: 'Frontend & Modern Web',
    url: 'https://skillicons.dev/icons?i=ts,react,nextjs',
    expectedIcons: 3,
    expectedWidth: '160.5',
    expectedHeight: '48',
    expectedViewBox: '0 0 856 256',
    expectedTranslates: [0, 300, 600]
  },
  {
    name: 'Cloud Infrastructure, DevOps & Systems',
    url: 'https://skillicons.dev/icons?i=docker,kubernetes,linux,git',
    expectedIcons: 4,
    expectedWidth: '216.75',
    expectedHeight: '48',
    expectedViewBox: '0 0 1156 256',
    expectedTranslates: [0, 300, 600, 900]
  }
];

function fetchSvg(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({
        statusCode: res.statusCode,
        contentType: res.headers['content-type'],
        body: data
      }));
    }).on('error', reject);
  });
}

async function verifySkilliconsComposite() {
  console.log('======================================================================');
  console.log(' STARTING SKILL ICONS COMPOSITE SVG PAYLOAD VERIFICATION');
  console.log('======================================================================');
  let allPassed = true;

  for (const spec of EXPECTED_SPECS) {
    console.log(`\nVerifying [${spec.name}]`);
    console.log(`URL: ${spec.url}`);
    
    try {
      const { statusCode, contentType, body } = await fetchSvg(spec.url);

      // Layer 1: HTTP Status & Content-Type
      if (statusCode !== 200) {
        console.error(`  ❌ HTTP Status failed: expected 200, got ${statusCode}`);
        allPassed = false;
        continue;
      }
      if (!contentType || !contentType.includes('image/svg+xml')) {
        console.error(`  ❌ Content-Type failed: expected image/svg+xml, got ${contentType}`);
        allPassed = false;
        continue;
      }

      // Layer 2: Root SVG Geometry (width, height, viewBox)
      const rootSvgMatch = body.match(/<svg([^>]*)>/);
      if (!rootSvgMatch) {
        console.error('  ❌ Could not find root <svg> tag in response payload');
        allPassed = false;
        continue;
      }
      const rootAttrs = rootSvgMatch[1];
      const widthMatch = rootAttrs.match(/width="([^"]*)"/);
      const heightMatch = rootAttrs.match(/height="([^"]*)"/);
      const viewBoxMatch = rootAttrs.match(/viewBox="([^"]*)"/);

      const actualWidth = widthMatch ? widthMatch[1] : null;
      const actualHeight = heightMatch ? heightMatch[1] : null;
      const actualViewBox = viewBoxMatch ? viewBoxMatch[1] : null;

      if (actualWidth !== spec.expectedWidth) {
        console.error(`  ❌ Root width mismatch: expected "${spec.expectedWidth}", got "${actualWidth}"`);
        allPassed = false;
      }
      if (actualHeight !== spec.expectedHeight) {
        console.error(`  ❌ Root height mismatch: expected "${spec.expectedHeight}", got "${actualHeight}"`);
        allPassed = false;
      }
      if (actualViewBox !== spec.expectedViewBox) {
        console.error(`  ❌ Root viewBox mismatch: expected "${spec.expectedViewBox}", got "${actualViewBox}"`);
        allPassed = false;
      }

      // Layer 3: Nested SVG Count (each icon renders in its own 256x256 sub-canvas)
      const nestedSvgs = (body.match(/<svg\b[^>]*viewBox="0 0 256 256"/g) || []).length;
      if (nestedSvgs !== spec.expectedIcons) {
        console.error(`  ❌ Nested SVG count mismatch: expected ${spec.expectedIcons}, got ${nestedSvgs}`);
        allPassed = false;
      }

      // Layer 4: Spatial Transformation Offsets
      const translateMatches = [...body.matchAll(/<g\b[^>]*transform="translate\((\d+),\s*0\)"/g)].map(m => parseInt(m[1], 10));
      const isTranslatesValid = JSON.stringify(translateMatches) === JSON.stringify(spec.expectedTranslates);
      if (!isTranslatesValid) {
        console.error(`  ❌ Transformation offsets mismatch: expected ${JSON.stringify(spec.expectedTranslates)}, got ${JSON.stringify(translateMatches)}`);
        allPassed = false;
      }

      // Layer 5: Anti-Truncation Regression Check
      if (actualWidth === '48' || actualViewBox === '0 0 256 256' || nestedSvgs === 1) {
        console.error('  ❌ TRUNCATION REGRESSION DETECTED! Icon count appears to be single (1).');
        allPassed = false;
      }

      if (allPassed) {
        console.log(`  ✅ PASSED: ${nestedSvgs}/${spec.expectedIcons} icons confirmed (Width: ${actualWidth}px, ViewBox: "${actualViewBox}", Offsets: [${translateMatches.join(', ')}])`);
      }
    } catch (err) {
      console.error(`  ❌ Network/parsing error: ${err.message}`);
      allPassed = false;
    }
  }

  console.log('\n======================================================================');
  if (!allPassed) {
    console.error('❌ VERIFICATION FAILED: One or more endpoints did not return full composite SVGs.');
    process.exit(1);
  } else {
    console.log('🎉 ALL SKILLICONS COMPOSITE ENDPOINTS VERIFIED: 100% COMPLETE & ACCURATE');
    console.log('======================================================================');
  }
}

verifySkilliconsComposite().catch(err => {
  console.error('Fatal error during verification execution:', err);
  process.exit(1);
});
