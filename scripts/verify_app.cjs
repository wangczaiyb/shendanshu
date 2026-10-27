const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function run() {
  console.log('Launching Chrome for end-to-end verification...');
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--ignore-gpu-blocklist',
      '--window-size=1280,800',
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  const consoleLogs = [];
  const errors = [];

  page.on('console', (msg) => {
    const text = msg.text();
    consoleLogs.push(`[Browser ${msg.type()}] ${text}`);
    if (msg.type() === 'error') {
      errors.push(text);
    }
  });

  page.on('pageerror', (err) => {
    errors.push(`[PageError] ${err.toString()}`);
  });

  console.log('Navigating to http://localhost:4173/ ...');
  await page.goto('http://localhost:4173/', { waitUntil: 'networkidle0' });

  // 1. Verify Password Gate
  console.log('1. Checking Password Gate...');
  const title = await page.$eval('.gate-title', (el) => el.textContent);
  console.log('Gate Title found:', title);

  const screenshotDir = path.join(__dirname, '..', 'screenshots');
  if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir);

  await page.screenshot({ path: path.join(screenshotDir, '01_password_gate.png') });
  console.log('Saved screenshot: 01_password_gate.png');

  // 2. Unlock with Password
  console.log('2. Entering password "2025" ...');
  await page.type('.input-wrapper input', '2025');
  await page.click('.unlock-button');

  // Wait for transition & canvas
  console.log('3. Waiting for intro sequence & tree formation...');
  await new Promise((r) => setTimeout(r, 2500));

  await page.screenshot({ path: path.join(screenshotDir, '02_tree_intro.png') });
  console.log('Saved screenshot: 02_tree_intro.png');

  // 3. Verify HUD
  console.log('4. Verifying HUD and controls...');
  const brandTitle = await page.$eval('.brand-title', (el) => el.textContent);
  console.log('Brand title:', brandTitle);

  // Check photo badge
  const photoBadge = await page.$eval('.photo-badge', (el) => el.textContent);
  console.log('Preset photos loaded count:', photoBadge);

  // 4. Test Disperse Button
  console.log('5. Clicking Disperse (星尘爆发) button...');
  await page.click('.disperse-btn');
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: path.join(screenshotDir, '03_particle_disperse.png') });
  console.log('Saved screenshot: 03_particle_disperse.png');

  // 5. Open Photo Modal
  console.log('6. Opening Photo Management Modal...');
  await page.click('.photo-btn');
  await new Promise((r) => setTimeout(r, 500));
  const modalCardsCount = await page.$$eval('.photo-card-item', (els) => els.length);
  console.log('Modal cards rendered count:', modalCardsCount);
  await page.screenshot({ path: path.join(screenshotDir, '04_photo_modal.png') });
  console.log('Saved screenshot: 04_photo_modal.png');

  // 6. Select first card to focus
  console.log('7. Selecting first card to focus in 3D...');
  await page.click('.photo-thumb-wrapper');
  await new Promise((r) => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(screenshotDir, '05_photo_focused.png') });
  console.log('Saved screenshot: 05_photo_focused.png');

  // Check focused bar
  const focusedTitle = await page.$eval('.photo-title', (el) => el.textContent);
  console.log('Focused photo title in HUD:', focusedTitle);

  // 7. Test Next Photo navigation
  console.log('8. Clicking Next Photo button...');
  await page.click('.focused-photo-bar .nav-btn:nth-child(3)');
  await new Promise((r) => setTimeout(r, 1200));
  const nextTitle = await page.$eval('.photo-title', (el) => el.textContent);
  console.log('Switched to next photo title:', nextTitle);
  await page.screenshot({ path: path.join(screenshotDir, '06_photo_switched.png') });

  // 8. Exit Focus
  console.log('9. Exiting focus...');
  await page.click('.exit-focus-btn');
  await new Promise((r) => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(screenshotDir, '07_tree_idle.png') });

  console.log('\n--- VERIFICATION SUMMARY ---');
  console.log('Errors logged by page:', errors.length);
  if (errors.length > 0) {
    console.error('Errors:', errors);
  } else {
    console.log('SUCCESS: No page errors encountered!');
  }

  await browser.close();
}

run().catch((err) => {
  console.error('Test run failed:', err);
  process.exit(1);
});
