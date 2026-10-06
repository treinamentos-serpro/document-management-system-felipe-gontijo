const { after, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { createApp } = require('../src/app');

let server;
let storageDir;
let baseUrl;

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  if (storageDir) await fs.rm(storageDir, { recursive: true, force: true });
});

test('upload, listagem e download respeitam os contratos e o armazenamento local', async () => {
  storageDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dms-test-'));
  const app = createApp({ storageDir, ownerId: 'test-user', maxFileSizeBytes: 8 });
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;

  const missingFile = await fetch(`${baseUrl}/upload`, { method: 'POST', body: new FormData() });
  assert.equal(missingFile.status, 400);
  assert.equal((await missingFile.json()).error.code, 'FILE_REQUIRED');

  const oversizedForm = new FormData();
  oversizedForm.append('file', new Blob(['123456789']), 'large.txt');
  const oversizedUpload = await fetch(`${baseUrl}/upload`, { method: 'POST', body: oversizedForm });
  assert.equal(oversizedUpload.status, 413);
  assert.equal((await oversizedUpload.json()).error.code, 'FILE_TOO_LARGE');

  const form = new FormData();
  form.append('file', new Blob(['hello']), '../hello.txt');
  const upload = await fetch(`${baseUrl}/upload`, { method: 'POST', body: form });
  assert.equal(upload.status, 201);
  const document = await upload.json();
  assert.equal(document.originalName, 'hello.txt');
  assert.equal(document.size, 5);
  assert.equal(document.owner, 'test-user');
  assert.equal(Object.hasOwn(document, 'storageName'), false);

  const storedFiles = await fs.readdir(storageDir);
  assert.equal(storedFiles.length, 1);
  assert.notEqual(storedFiles[0], document.originalName);

  const listing = await fetch(`${baseUrl}/documents`);
  assert.deepEqual((await listing.json()).documents, [document]);

  const download = await fetch(`${baseUrl}/documents/${document.id}/download`);
  assert.equal(download.status, 200);
  assert.equal(download.headers.get('content-disposition').includes('hello.txt'), true);
  assert.equal(await download.text(), 'hello');

  const notFound = await fetch(`${baseUrl}/documents/unknown/download`);
  assert.equal(notFound.status, 404);
  assert.equal((await notFound.json()).error.code, 'DOCUMENT_NOT_FOUND');
});
