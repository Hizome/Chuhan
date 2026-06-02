import { chromium } from 'playwright';

const browser = await chromium.launch({
  headless: false,
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--no-sandbox', '--disable-setuid-sandbox']
});
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });

const logs = [];
page.on('console', msg => logs.push(`[${msg.type()}] ${msg.text()}`));

await page.goto('http://localhost:1423/', { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);
await page.click('text=新建对局');
await page.waitForTimeout(2000);

// Click b3 (left red cannon)
await page.locator('[data-square="b3"]').first().click();
await page.waitForTimeout(500);
await page.screenshot({ path: 'screenshot_highlight.png', fullPage: false });

console.log('Logs:', logs.filter(l => l.includes('pointerdown')));
await browser.close();
