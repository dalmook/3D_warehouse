import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {dismissWelcome, reveal} from './workbench-navigation.mjs';

const base = new URL(process.env.BASE_URL || 'http://127.0.0.1:4173/');
const forced = new URL(base); forced.searchParams.set('renderer', '2d');
const dir = process.env.QA_DIR || 'qa-evidence'; await fs.mkdir(dir, {recursive: true});
const browser = await chromium.launch({channel: process.env.BROWSER_CHANNEL || undefined, args: ['--disable-webgl']});
const context = await browser.newContext({viewport: {width: 1440, height: 1000}, locale: 'ko-KR'});
const page = await context.newPage(), errors = [], results = [];
page.on('pageerror', e => errors.push(e.message)); page.on('dialog', d => d.accept());
const state = () => page.evaluate(() => window.__warehouseCity.getLayout());
const ready = async p => { await p.waitForFunction(() => document.documentElement.dataset.ready === 'true'); await dismissWelcome(p); };
const check = async (name, fn) => { try { await fn(); results.push({name, passed: true}); console.log('PASS', name); } catch (e) { results.push({name, passed: false, error: e.message}); await page.screenshot({path: `${dir}/fallback-failure.png`}).catch(() => {}); throw e; } };
const at = async (x, y) => page.evaluate(([x, y]) => window.__warehouseCity.screenPoint(x, y), [x, y]);

try {
  await check('WebGL-disabled browser automatically boots a usable 2D workbench', async () => {
    await page.goto(base.href); await ready(page);
    assert.equal(await page.evaluate(() => window.__warehouseCity.renderer), 'canvas2d');
    assert.equal(await page.evaluate(() => window.__warehouseCity.version), '10.0.0');
    assert.equal(await page.locator('#fatal').isVisible(), false);
    assert.equal(await page.locator('#s3').textContent(), '256');
    for (const id of ['isoBtn', 'qualityPreset']) assert.equal(await page.locator('#' + id).isDisabled(), true);
    for (const mode of ['sim', 'walk']) assert.equal(await page.locator(`[data-mode="${mode}"]`).isDisabled(), true);
    assert.equal(await page.evaluate(() => window.__warehouseCity.getMode()), 'edit');
  });
  await check('forced 2D mode and task tabs expose working controls', async () => {
    await page.goto(forced.href); await ready(page);
    await (await reveal(page, 'rowBtn')).click(); assert.equal(await page.locator('#rowDialog').isVisible(), true); await page.locator('#rowClose').click();
    await reveal(page, 'blankBtn'); assert.equal(await page.locator('[data-panel="project"]').getAttribute('aria-selected'), 'true');
    await reveal(page, 'catalog'); assert.equal(await page.locator('[data-panel="catalog"]').getAttribute('aria-selected'), 'true');
    assert.ok(await page.locator('#catalog img').count() > 5);
  });
  await check('real pointer placement, dragging and inspector edits work without WebGL', async () => {
    await (await reveal(page, 'blankBtn')).click(); assert.equal((await state()).objects.length, 0);
    await reveal(page, 'catalog'); await page.locator('.asset[data-type="rack"]').click();
    let p = await at(10, 10); await page.mouse.click(p.x, p.y);
    assert.equal((await state()).objects.length, 1);
    await page.keyboard.press('Escape');
    p = await at(10, 10); const destination = await at(14, 12);
    await page.mouse.move(p.x, p.y); await page.mouse.down(); await page.mouse.move(destination.x, destination.y, {steps: 8}); await page.mouse.up();
    assert.equal((await state()).objects[0].x, 14); assert.equal((await state()).objects[0].y, 12);
    await (await reveal(page, 'objectName')).fill('테스트 A-01'); await page.locator('#rackBays').fill('3'); await page.locator('#rackLevels').fill('5'); await page.locator('#applyObject').click();
    assert.equal((await state()).objects[0].name, '테스트 A-01'); assert.equal(await page.locator('#s3').textContent(), '30');
    await page.locator('#rotateBtn').click(); assert.equal((await state()).objects[0].rotation, 90);
    await page.locator('#undoBtn').click(); assert.equal((await state()).objects[0].rotation, 0);
    await page.locator('#redoBtn').click(); assert.equal((await state()).objects[0].rotation, 90);
    const previous = await state(); await (await reveal(page, 'ox')).fill('-10'); await page.locator('#applyObject').click();
    assert.deepEqual(await state(), previous);
  });
  await check('2D JSON exports, imports and autosave preserve the complete plan', async () => {
    await page.locator('#projectName').fill('평면 검증 도면'); await page.locator('#projectName').blur();
    const expected = await state(), event = page.waitForEvent('download'); await page.locator('#exportBtn').click();
    const file = `${dir}/fallback-roundtrip.json`; await (await event).saveAs(file); assert.deepEqual(JSON.parse(await fs.readFile(file, 'utf8')), expected);
    await (await reveal(page, 'blankBtn')).click(); await page.locator('#importFile').setInputFiles(file);
    await page.waitForFunction(() => window.__warehouseCity.getLayout().projectName === '평면 검증 도면'); assert.deepEqual(await state(), expected);
    await page.reload(); await ready(page); assert.deepEqual(await state(), expected);
  });
  await check('2D GitHub commits use SHA guards and clear transient credentials', async () => {
    let remote = null, puts = 0; const token = 'fallback-test-token-not-a-secret';
    await page.route('https://api.github.com/repos/**', async route => {
      const req = route.request(); const headers = {'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,PUT,OPTIONS'};
      const reply = (status, body) => route.fulfill({status, headers, contentType: 'application/json', body: JSON.stringify(body)});
      if (req.method() === 'OPTIONS') return reply(200, {});
      if (req.method() === 'PUT') { puts++; const body = req.postDataJSON(); remote = {type: 'file', path: 'layouts/my-warehouse.json', name: 'my-warehouse.json', sha: 'fallback-sha-' + puts, content: body.content}; return reply(201, {content: {sha: remote.sha}, commit: {sha: 'abc1234'.padEnd(40, '0')}}); }
      if (new URL(req.url()).pathname.endsWith('/contents/layouts')) return reply(200, remote ? [remote] : []);
      return reply(remote ? 200 : 404, remote || {message: 'Not Found'});
    });
    await page.locator('#githubBtn').click(); await page.locator('#ghToken').fill(token); await page.locator('#ghConsent').check(); await page.locator('#ghSave').click();
    await page.waitForFunction(() => document.querySelector('#ghStatus').textContent.includes('커밋 완료')); assert.equal(puts, 1);
    assert.deepEqual(JSON.parse(Buffer.from(remote.content, 'base64').toString('utf8')), await state());
    remote.sha = 'updated-by-another-device'; await page.locator('#ghSave').click();
    await page.waitForFunction(() => document.querySelector('#ghStatus').textContent.includes('원격 도면이 변경')); assert.equal(puts, 1);
    assert.equal(await page.evaluate(t => JSON.stringify({...localStorage, ...sessionStorage}).includes(t), token), false);
    await page.locator('#ghClose').click(); assert.equal(await page.locator('#ghToken').inputValue(), ''); assert.equal(await page.locator('#ghConsent').isChecked(), false);
  });
  await check('2D output, review and equipment schedule remain available', async () => {
    await (await reveal(page, 'demoBtn')).click();
    await page.locator('#wbReview').click(); assert.equal(await page.locator('#wbReviewDialog').isVisible(), true); await page.locator('#wbReviewDialogClose').click();
    await page.locator('#wbSchedule').click(); assert.ok(await page.locator('#wbScheduleDialog tbody tr').count() > 0); await page.locator('#wbScheduleDialogClose').click();
    await page.locator('#downloadDrawing').click(); const event = page.waitForEvent('download'); await page.locator('#fallbackSVG').click(); assert.ok((await event).suggestedFilename().endsWith('.svg')); await page.locator('#drawingDialog [data-dismiss]').click();
    await reveal(page, 'catalog'); await page.locator('#topBtn').click();
    await page.screenshot({path: `${dir}/workbench-fallback-desktop.png`});
  });
  await check('mobile 2D workbench fits the screen and exposes its panels', async () => {
    const mobile = await browser.newContext({viewport: {width: 390, height: 844}, isMobile: true, hasTouch: true, deviceScaleFactor: 1, locale: 'ko-KR'});
    const p = await mobile.newPage(); p.on('pageerror', e => errors.push(e.message)); p.on('dialog', d => d.accept());
    await p.goto(forced.href); await ready(p);
    assert.equal(await p.evaluate(() => window.__warehouseCity.renderer), 'canvas2d'); assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await reveal(p, 'catalog'); assert.equal(await p.locator('#left').isVisible(), true); await p.locator('[data-close="left"]').click();
    await reveal(p, 'warehouseW'); assert.equal(await p.locator('#right').isVisible(), true); await p.locator('[data-close="right"]').click();
    await p.screenshot({path: `${dir}/workbench-fallback-mobile.png`});
    await p.locator('#githubBtn').click(); assert.equal(await p.locator('#githubDialog').isVisible(), true); await p.locator('#ghClose').click();
    await mobile.close();
  });
  await check('2D workbench completes without unhandled exceptions', async () => {
    assert.deepEqual(errors, []); assert.deepEqual(await page.evaluate(() => window.__warehouseErrors), []);
  });
} finally {
  await fs.writeFile(`${dir}/fallback-browser-results.json`, JSON.stringify({passed: results.length === 8 && results.every(r => r.passed), results, errors}, null, 2));
  await browser.close();
}
