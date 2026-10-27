import puppeteer from 'puppeteer-core';

async function testGl() {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--enable-webgl',
      '--ignore-gpu-blocklist',
      '--use-gl=swiftshader',
    ],
  });

  const page = await browser.newPage();
  const glSupport = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    return gl ? gl.getParameter(gl.RENDERER) : null;
  });

  console.log('WebGL renderer:', glSupport);
  await browser.close();
}

testGl().catch(console.error);
