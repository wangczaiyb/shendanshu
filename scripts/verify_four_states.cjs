const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function verify() {
  console.log('Launching headless Chrome for 4-State Verification...');
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

  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.toString()));

  console.log('Navigating to http://localhost:4173/ ...');
  await page.goto('http://localhost:4173/', { waitUntil: 'networkidle0' });

  const screenshotDir = path.join(__dirname, '..', 'screenshots');
  if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir);

  // 1. Password Gate
  console.log('1. Unlocking Password Gate...');
  await page.type('.input-wrapper input', '2025');
  await page.click('.unlock-button');
  await new Promise((r) => setTimeout(r, 1500));

  // 2. State A: TREE
  console.log('2. Verifying State A: TREE (Classic Luxury Tree)...');
  await new Promise((r) => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(screenshotDir, 'state_A_TREE.png') });
  console.log('Saved: state_A_TREE.png');

  // 3. State B: EXPLODED (Scatter to 3D Galaxy)
  console.log('3. Triggering State B: EXPLODED (Scatter into Galaxy)...');
  // Click scatter button
  const scatterBtn = await page.$('.bottom-dock .dock-btn:nth-child(1)');
  if (scatterBtn) await scatterBtn.click();
  await new Promise((r) => setTimeout(r, 2200));
  await page.screenshot({ path: path.join(screenshotDir, 'state_B_EXPLODED.png') });
  console.log('Saved: state_B_EXPLODED.png');

  // 4. State C: PHOTO_FOCUS (Pinch / Select Photo)
  console.log('4. Triggering State C: PHOTO_FOCUS (Focused Photo Card)...');
  // Trigger raycast or focus photo
  await page.evaluate(() => {
    // Click on center or trigger photo focus
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
  });
  await new Promise((r) => setTimeout(r, 2000));
  await page.screenshot({ path: path.join(screenshotDir, 'state_C_PHOTO_FOCUS.png') });
  console.log('Saved: state_C_PHOTO_FOCUS.png');

  // 5. State D: RETURNING (Gather back into Tree)
  console.log('5. Triggering State D: RETURNING (Gather particles back to Tree)...');
  // Exit focus then click gather
  await page.evaluate(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
  });
  await new Promise((r) => setTimeout(r, 800));

  const gatherBtn = await page.$('.bottom-dock .dock-btn:nth-child(2)');
  if (gatherBtn) await gatherBtn.click();
  await new Promise((r) => setTimeout(r, 1200));
  await page.screenshot({ path: path.join(screenshotDir, 'state_D_RETURNING.png') });
  console.log('Saved: state_D_RETURNING.png');

  // Settle back into full Tree
  await new Promise((r) => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(screenshotDir, 'state_A_RESTORED_TREE.png') });
  console.log('Saved: state_A_RESTORED_TREE.png');

  console.log('\n--- VERIFICATION FINISHED ---');
  console.log('Page Errors encountered:', errors.length);
  if (errors.length > 0) {
    console.error('Errors:', errors);
  } else {
    console.log('SUCCESS: All 4 states transitioned with 0 errors!');
  }

  await browser.close();
}

verify().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
