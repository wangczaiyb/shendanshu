import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/27217/.gemini/antigravity/brain/6d32849f-5c27-475d-b38f-507e45a9ceca';
const CHROME_PATH = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  console.log('Launching Chrome from:', CHROME_PATH);
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
    await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });

    page.on('console', (msg) => {
      console.log('Browser log:', msg.type(), msg.text());
    });

    console.log('Navigating to http://localhost:4173/ ...');
    await page.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await delay(1500);

    // 0. Password Gate Screenshot
    console.log('Capturing Password Gate...');
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, '00_password_gate.png'),
    });

    // 1. Password Entry
    console.log('Submitting password 2025...');
    const inputSelector = 'input[type="password"]';
    await page.waitForSelector(inputSelector);
    await page.type(inputSelector, '2025');
    await page.keyboard.press('Enter');
    await delay(2000);

    // 2. Concrete Tree Idle (Full Tree Assembled with 3D concrete ornaments)
    console.log('Capturing Concrete Tree Idle...');
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, '01_concrete_tree_idle.png'),
    });

    // 3. Showcase Zoom Mode
    console.log('Activating Showcase Zoom...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('.dock-btn'));
      const showcaseBtn = btns.find((b) => b.textContent && b.textContent.includes('漫步特写'));
      if (showcaseBtn) showcaseBtn.click();
    });
    await delay(2200);
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, '02_concrete_tree_showcase_zoom.png'),
    });

    // 4. Object Focus: Focus an item (via SceneManager or tap)
    console.log('Focusing a concrete item (e.g. golden bell or photo)...');
    await page.evaluate(() => {
      // Find a bell or photo item and focus
      const canvas = document.querySelector('canvas.webgl-canvas');
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        // Tap on tree middle tier
        const eventDown = new PointerEvent('pointerdown', {
          clientX: rect.left + rect.width * 0.48,
          clientY: rect.top + rect.height * 0.42,
          bubbles: true,
        });
        canvas.dispatchEvent(eventDown);
        const eventUp = new PointerEvent('pointerup', {
          clientX: rect.left + rect.width * 0.48,
          clientY: rect.top + rect.height * 0.42,
          bubbles: true,
        });
        canvas.dispatchEvent(eventUp);
      }
    });
    await delay(2000);
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, '03_concrete_item_focused.png'),
    });

    // 5. Trigger Interactive Action
    console.log('Triggering interactive action on focused object...');
    await page.evaluate(() => {
      const actionBtn = document.querySelector('.focus-action-btn');
      if (actionBtn) actionBtn.click();
    });
    await delay(1000);
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, '04_concrete_item_interactive_action.png'),
    });

    // 6. Exploded Mode (Galaxy Dispersion of 3D Objects)
    console.log('Activating Exploded Mode (3D Objects Galaxy)...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('.dock-btn'));
      const scatterBtn = btns.find((b) => b.textContent && b.textContent.includes('散开'));
      if (scatterBtn) scatterBtn.click();
    });
    await delay(2500);
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, '05_concrete_items_exploded_galaxy.png'),
    });

    // 7. Reassembling Mode
    console.log('Activating Reassembling Mode...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('.dock-btn'));
      const gatherBtn = btns.find((b) => b.textContent && b.textContent.includes('聚拢'));
      if (gatherBtn) gatherBtn.click();
    });
    await delay(1400);
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, '06_concrete_reassembling.png'),
    });

    // 8. Mobile Portrait Viewport
    console.log('Switching to Mobile Portrait Viewport (390x844)...');
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await delay(1000);

    // If password gate appeared, unlock it
    const passInput = await page.$('input[type="password"]');
    if (passInput) {
      await page.type('input[type="password"]', '2025');
      await page.keyboard.press('Enter');
      await delay(2000);
    }

    await delay(1500);
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, '07_concrete_mobile_portrait.png'),
    });

    console.log('ALL VERIFICATION SCREENSHOTS CAPTURED SUCCESSFULLY!');
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error('Puppeteer verification failed:', err);
  process.exit(1);
});
