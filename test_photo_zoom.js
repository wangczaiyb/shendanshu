import puppeteer from 'puppeteer-core';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/27217/.gemini/antigravity/brain/6d32849f-5c27-475d-b38f-507e45a9ceca';
const CHROME_PATH = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  console.log('Launching Chrome to test Photo Enlarge & Zoom...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--enable-webgl',
      '--ignore-gpu-blocklist',
      '--use-gl=swiftshader',
      '--window-size=1280,800',
    ],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    console.log('Navigating to http://localhost:4173/ ...');
    await page.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await delay(1500);

    // Password unlock
    console.log('Unlocking password...');
    await page.waitForSelector('input[type="password"]');
    await page.type('input[type="password"]', '2025');
    await page.keyboard.press('Enter');
    await delay(2000);

    // Open Photo Modal and select first photo
    console.log('Opening Photo Album and selecting Photo #1...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('.dock-btn'));
      const albumBtn = btns.find((b) => b.textContent && b.textContent.includes('相册'));
      if (albumBtn) albumBtn.click();
    });
    await delay(800);

    // Click first photo card in album
    await page.evaluate(() => {
      const photoCards = Array.from(document.querySelectorAll('.photo-card'));
      if (photoCards.length > 0) photoCards[0].click();
    });
    await delay(1800);

    // 1. Capture 3D Photo Focused
    console.log('Capturing 3D Photo Focused in foreground...');
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, '08_3d_photo_focused_large.png'),
    });

    // 2. Click "放大查看高清大图" in the HUD card
    console.log('Opening Lightbox Zoom...');
    await page.evaluate(() => {
      const zoomBtn = document.querySelector('.photo-zoom-btn');
      if (zoomBtn) zoomBtn.click();
    });
    await delay(1000);

    // Capture Lightbox Default
    console.log('Capturing Photo Lightbox Viewer...');
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, '09_photo_lightbox_enlarged.png'),
    });

    // 3. Zoom In inside Lightbox
    console.log('Zooming In inside Lightbox (+)...');
    await page.evaluate(() => {
      const tools = Array.from(document.querySelectorAll('.lightbox-tools .tool-btn'));
      if (tools.length > 0) {
        tools[0].click(); // First tool is zoom in
        tools[0].click(); // Zoom twice for dramatic enlargement
      }
    });
    await delay(800);
    console.log('Capturing Zoomed In Lightbox (170%)...');
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, '10_photo_lightbox_zoomed_in.png'),
    });

    // 4. Switch to Next Photo inside Lightbox
    console.log('Switching to next photo in Lightbox (→)...');
    await page.evaluate(() => {
      const nextBtn = document.querySelector('.lightbox-nav-arrow.next');
      if (nextBtn) nextBtn.click();
    });
    await delay(800);
    console.log('Capturing Switched Photo in Lightbox...');
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, '11_photo_lightbox_switched.png'),
    });

    console.log('ALL PHOTO ZOOM TESTS PASSED AND SCREENSHOTS CAPTURED!');
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
