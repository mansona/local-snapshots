import { program } from 'commander';
import puppeteer from 'puppeteer';
import { join, posix } from 'node:path';
import { readFile, stat, mkdir } from 'node:fs/promises';

program
  .requiredOption('-u, --urls <strings...>', 'The urls to screenshot')
  .requiredOption(
    '-h, --host <string>',
    'The host your server is running at e.g. http://localhost:4200',
  )
  .option(
    '-w, --width [number]',
    'The width of the screenshot (in pixels)',
    1920,
  )
  .option('-p, --path [string]', 'The path to output screenshots', 'snapshots');

try {
  const file = await readFile('./.snapshotrc.json');
  const config = JSON.parse(file);

  const params = ['urls', 'path', 'host'];

  for (let p of params) {
    if (config[p]) {
      program.setOptionValueWithSource(p, config[p], 'config');
    }
  }
} catch (error) {
  console.warn(error);
}

program.parse();

const options = program.opts();

try {
  await stat(options.path);
} catch {
  await mkdir(options.path);
}

const browser = await puppeteer.launch();
const page = await browser.newPage();
page.setViewport({
  height: 1080,
  width: options.width,
});
for (let url of options.urls) {
  const location = posix.join(options.host, url);
  console.log(`Taking a snapshot of ${location}`);
  await page.goto(location);

  page.addStyleTag({ content: 'body * { transition: none !important; }' });
  const filename = url
    .replaceAll('#', '')
    .replace(/^\//, '')
    .replaceAll('/', '_');
  await page.screenshot({
    path: join(options.path, filename.length ? filename : '<empty>') + '.png',
    fullPage: true,
  });
}

await browser.close();
