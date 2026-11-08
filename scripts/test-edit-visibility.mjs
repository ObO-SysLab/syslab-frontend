// Focused UI regression against an existing local Next dev server.
// Usage: node scripts/test-edit-visibility.mjs http://127.0.0.1:3106 [evidence-directory]
// Every browser context is disposable. Authentication and API data below are synthetic.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const base = new URL(process.argv[2] ?? 'http://127.0.0.1:3106');
assert(base.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(base.hostname));
assert.equal(base.pathname, '/');
const output = process.argv[3] ? path.resolve(process.argv[3]) : null;
if (output) await fs.mkdir(output, {recursive: true});
const labels = {private: '비공개', public: '전체 공개', group: '그룹 공개', contest: '대회 공개'};
const results = [], errors = [];
const token = 'fixture.' + Buffer.from(JSON.stringify({sub: 'visibility-fixture'})).toString('base64url') + '.fixture';
const browser = await chromium.launch({channel: 'chrome', headless: true});

try {
  let id = 9000;
  for (const [type, visibility, restoreOldDraft] of [
    ['objective', 'private', true], ['coding', 'private', false], ['practice', 'private', false],
    ['objective', 'public', false], ['objective', 'group', false], ['objective', 'contest', false],
    ['objective', 'unknown', false], ['new', 'public', false],
  ]) {
    id++;
    const title = `Local visibility fixture ${id}`;
    const detail = {probId: id, type, title, visibility, isOwner: true, category: 'kernel', difficulty: 1,
      summary: 'Synthetic local UI regression', description: 'Synthetic description',
      choices: [{id: 'choice_1', index: 1, content: 'First'}, {id: 'choice_2', index: 2, content: 'Second'}],
      constraints: {timeLimitMs: 1000, memoryLimitMb: 256, allowedLanguages: ['python']},
      inputDescription: 'Input', outputDescription: 'Output', testcases: [{index: 1, input: '1', output: '1', isSample: true}]};
    const draft = {problemType: 'objective', title: 'Old public draft', summary: 'Draft', description: 'Restored draft description',
      category: 'kernel', difficulty: '1', visibility: 'public', timeLimit: 1, memoryLimit: 256,
      inputDesc: '', outputDesc: '', allowedLanguages: ['python'], testcases: [], choices: detail.choices,
      selectedAnswers: [1], isOrderedAnswer: false, oboEnabled: false,
      oboData: {mode: 'single', single: {nodes: [], edges: [], frames: []}}, editVersion: 'fixture-revision',
      selectedGroupId: null, selectedContestId: null, oboAlternates: {}};
    const scope = `obo:problem-draft:v1:visibility-fixture:${id}:`;
    const record = {v: 1, scope, id: scope + 'old', savedAt: '2026-11-05T00:00:00.000Z', value: draft};
    const context = await browser.newContext({viewport: {width: 1440, height: 1000}});
    await context.addInitScript(({origin, token, record}) => {
      if (location.origin !== origin) return;
      localStorage.setItem('token', token);
      if (record) localStorage.setItem(record.id, JSON.stringify(record));
    }, {origin: base.origin, token, record: restoreOldDraft ? record : null});
    const patches = []; let audienceListReads = 0;
    await context.route('**/*', async route => {
      const request = route.request(), url = new URL(request.url());
      if (url.origin !== base.origin) {
        if (['data:', 'blob:'].includes(url.protocol)) return route.continue();
        return route.abort();
      }
      if (!url.pathname.startsWith('/api/')) return route.continue();
      if (url.pathname === `/api/problems/${type}/${id}` && request.method() === 'PATCH') {
        patches.push(request.postDataJSON());
        return route.fulfill({status: 200, json: {data: {probId: id}}});
      }
      if (request.method() !== 'GET') {
        errors.push('Unexpected fixture mutation');
        return route.fulfill({status: 400, json: {message: 'Unexpected fixture request'}});
      }
      let body = {data: {}};
      if (url.pathname === `/api/problems/${id}`) body = {data: detail};
      else if (url.pathname === '/api/challenges/obo/author/settings') {
        body = {oboJson: null, editVersion: 'fixture-revision', choices: detail.choices, answer: [1], testcases: detail.testcases};
      } else if (url.pathname === '/api/profile/show') body = {data: {userInfo: {nickname: 'Local fixture'}}};
      else if (url.pathname === '/api/groups/me' || url.pathname === '/api/contests/me/owned') {
        audienceListReads++; body = {data: []};
      } else if (url.pathname.endsWith('/ranking')) body = {data: {rankings: []}};
      else if (url.pathname.endsWith('/board')) body = {data: {submissions: []}};
      return route.fulfill({status: 200, json: body});
    });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    page.on('dialog', async dialog => {
      const expected = dialog.type() === 'confirm'
        ? '현재 작성 내용을 먼저 보관하고 선택한 초안을 불러올까요?'
        : '수정되었습니다!';
      if (dialog.message() !== expected) errors.push('Unexpected fixture dialog');
      if (dialog.message() === expected) await dialog.accept().catch(() => {});
      else await dialog.dismiss().catch(() => {});
    });
    try {
      await page.goto(`${base.origin}/challenges/create${type === 'new' ? '' : `?id=${id}`}`, {waitUntil: 'domcontentloaded', timeout: 90000});
      const control = page.getByText('공개범위', {exact: true}).locator('..').getByRole('combobox');
      await control.waitFor();
      if (type === 'new') {
        await control.getByText('전체 공개', {exact: true}).waitFor();
        assert.equal(await control.isEnabled(), true);
        assert.equal((await control.innerText()).trim(), '전체 공개');
        await control.click(); await page.getByRole('option', {name: '비공개', exact: true}).click();
        assert.equal((await control.innerText()).trim(), '비공개');
        results.push({type, createScopeStillSelectable: true});
        continue;
      }
      if (visibility === 'unknown') {
        await page.getByRole('alert').filter({hasText: '공개 범위를 확인할 수 없습니다.'}).waitFor();
        assert.equal(await page.getByRole('button', {name: '수정 완료', exact: true}).isDisabled(), true);
        assert.notEqual((await control.innerText()).trim(), '전체 공개');
        results.push({type, visibility, unknownScopeBlocksSave: true});
        continue;
      }
      await page.waitForFunction(expected => document.querySelector('#title')?.value === expected, title);
      assert.equal((await control.innerText()).trim(), labels[visibility]);
      assert.equal(await control.isDisabled(), true);
      assert.equal(await page.getByText('공개할 그룹 선택', {exact: false}).count(), 0);
      assert.equal(await page.getByText('공개할 대회 선택', {exact: false}).count(), 0);
      if (restoreOldDraft) {
        const restore = page.getByText(/Old public draft/).locator('..').getByRole('button', {name: '초안 복구', exact: true});
        await restore.click();
        await page.waitForFunction(() => document.querySelector('#title')?.value === 'Old public draft');
        assert.equal((await control.innerText()).trim(), '비공개');
        assert.equal(await control.isDisabled(), true);
        if (output) await page.screenshot({path: path.join(output, 'edit-private-after-old-draft.png'), fullPage: true});
      }
      const patchResponse = page.waitForResponse(response => new URL(response.url()).pathname === `/api/problems/${type}/${id}`
        && response.request().method() === 'PATCH');
      await page.getByRole('button', {name: '수정 완료', exact: true}).click();
      assert.equal((await patchResponse).status(), 200);
      await page.waitForURL(url => url.pathname === '/challenges/detail' && url.searchParams.get('id') === String(id));
      assert.equal(patches.length, 1);
      for (const field of ['visibility', 'groupId', 'contestId']) assert.equal(field in patches[0], false);
      assert.equal(audienceListReads, 0);
      results.push({type, visibility, displayedServerScope: true, readOnly: true, oldDraftScopeIgnored: restoreOldDraft,
        savedWithoutAudienceChanges: true, audienceListReads});
    } finally { await context.close(); }
  }
  assert.deepEqual(errors, []);
  const result = {ok: true, scope: 'Disposable loopback Chrome contexts; synthetic auth/API/drafts only; production browser unused',
    checks: results, pageErrors: errors, cases: results.length};
  if (output) await fs.writeFile(path.join(output, 'edit-visibility-browser.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result));
} finally { await browser.close(); }
