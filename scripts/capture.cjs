const { execSync } = require('child_process');
const fs = require('fs');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

function capture(url, outputFile) {
  const cmd = `"${chromePath}" --headless=new --disable-gpu --screenshot="${outputFile}" --window-size=1280,800 "${url}"`;
  console.log('Capturing:', url);
  execSync(cmd, { stdio: 'inherit' });
  if (fs.existsSync(outputFile)) {
    console.log('Saved screenshot:', outputFile, 'size:', fs.statSync(outputFile).size);
  }
}

capture('http://localhost:4173/', 'screenshot_gate.png');
