const { test } = require('node:test');
const assert = require('node:assert');
const { once } = require('node:events');
const { mkdtempSync } = require('node:fs');
const { readFile, readdir, rm, writeFile } = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const storageDir = mkdtempSync(path.join(os.tmpdir(), 'dms-test-'));
const previousStorageDir = process.env.DMS_STORAGE_DIR;
const previousLimit = process.env.MAX_FILE_SIZE_BYTES;
const previousOwner = process.env.DMS_OWNER_ID;
process.env.DMS_STORAGE_DIR = storageDir;
process.env.MAX_FILE_SIZE_BYTES = '64';
process.env.DMS_OWNER_ID = 'test-user';
const app = require('../src/app');

test('o app backend é exportado', () => {
  assert.ok(app, 'o app deve estar definido');
  assert.strictEqual(typeof app, 'function', 'o app Express deve ser uma função');
});

test('contratos HTTP de documentos', async (context) => {
  const server = app.listen(0, '127.0.0.1');
  context.after(async () => {
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
      server.closeAllConnections();
    });
    await rm(storageDir, { recursive: true, force: true });
    for (const [name, value] of Object.entries({
      DMS_STORAGE_DIR: previousStorageDir,
      MAX_FILE_SIZE_BYTES: previousLimit,
      DMS_OWNER_ID: previousOwner,
    })) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  });
  await once(server, 'listening');
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const content = Buffer.from('Conteudo do documento');
  let document;

  await context.test('mantém a verificação de saúde', async () => {
    const response = await fetch(`${baseUrl}/health`);
    assert.strictEqual(response.status, 200);
    assert.deepStrictEqual(await response.json(), { status: 'ok' });
  });

  await context.test('lista vazia antes do upload', async () => {
    const response = await fetch(`${baseUrl}/documents`);
    assert.strictEqual(response.status, 200);
    assert.deepStrictEqual(await response.json(), { documents: [] });
  });

  await context.test('rejeita upload sem arquivo', async () => {
    const response = await fetch(`${baseUrl}/upload`, { method: 'POST' });
    assert.strictEqual(response.status, 400);
    assert.strictEqual((await response.json()).error.code, 'FILE_REQUIRED');
  });

  await context.test('grava upload no disco e não aceita proprietário do formulário', async () => {
    const form = new FormData();
    form.append('file', new Blob([content], { type: 'text/plain' }), 'relatorio.txt');
    form.append('owner', 'other-user');
    const response = await fetch(`${baseUrl}/upload`, { method: 'POST', body: form });
    assert.strictEqual(response.status, 201);
    document = await response.json();
    assert.match(document.id, /^[0-9a-f-]{36}$/);
    assert.strictEqual(document.originalName, 'relatorio.txt');
    assert.strictEqual(document.size, content.length);
    assert.strictEqual(document.mimeType, 'text/plain');
    assert.strictEqual(document.owner, 'test-user');
    assert.strictEqual(new Date(document.uploadedAt).toISOString(), document.uploadedAt);
    assert.strictEqual(document.storageName, undefined);
    assert.strictEqual(document.path, undefined);
    const files = await readdir(storageDir);
    assert.strictEqual(files.length, 1);
    assert.notStrictEqual(files[0], 'relatorio.txt');
    assert.deepStrictEqual(await readFile(path.join(storageDir, files[0])), content);
  });

  await context.test('lista os metadados sem aceitar proprietário da query', async () => {
    const response = await fetch(`${baseUrl}/documents?owner=other-user`);
    assert.strictEqual(response.status, 200);
    assert.deepStrictEqual(await response.json(), { documents: [document] });
  });

  await context.test('baixa os bytes com o nome original', async () => {
    assert.ok(document);
    const response = await fetch(`${baseUrl}/documents/${document.id}/download`);
    assert.strictEqual(response.status, 200);
    assert.match(response.headers.get('content-disposition'), /attachment;.*relatorio\.txt/);
    assert.match(response.headers.get('content-type'), /^text\/plain/);
    assert.deepStrictEqual(Buffer.from(await response.arrayBuffer()), content);
  });

  await context.test('retorna 404 para documento inexistente', async () => {
    const response = await fetch(`${baseUrl}/documents/unknown/download`);
    assert.strictEqual(response.status, 404);
    assert.strictEqual((await response.json()).error.code, 'DOCUMENT_NOT_FOUND');
  });

  await context.test('rejeita arquivo acima do limite sem deixar arquivos parciais', async () => {
    const before = await readdir(storageDir);
    const form = new FormData();
    form.append('file', new Blob([Buffer.alloc(65)]), 'grande.txt');
    const response = await fetch(`${baseUrl}/upload`, { method: 'POST', body: form });
    assert.strictEqual(response.status, 413);
    assert.strictEqual((await response.json()).error.code, 'FILE_TOO_LARGE');
    assert.deepStrictEqual(await readdir(storageDir), before);
  });

  await context.test('rejeita campo de arquivo inesperado', async () => {
    const form = new FormData();
    form.append('document', new Blob([content]), 'relatorio.txt');
    const response = await fetch(`${baseUrl}/upload`, { method: 'POST', body: form });
    assert.strictEqual(response.status, 400);
    assert.strictEqual((await response.json()).error.code, 'FILE_REQUIRED');
  });

  await context.test('retorna 404 quando o arquivo local foi removido', async () => {
    assert.ok(document);
    for (const filename of await readdir(storageDir)) {
      await rm(path.join(storageDir, filename));
    }
    const response = await fetch(`${baseUrl}/documents/${document.id}/download`);
    assert.strictEqual(response.status, 404);
    assert.strictEqual((await response.json()).error.code, 'DOCUMENT_NOT_FOUND');
  });

  await context.test('filtra por proprietário e ordena pelos uploads mais recentes', async () => {
    const repository = require('../src/repositories/documentRepository');
    const service = require('../src/services/documentService');
    const older = {
      id: 'older', originalName: 'older.txt', storageName: 'older-file',
      size: 1, mimeType: 'text/plain', uploadedAt: '2026-01-01T00:00:00.000Z',
      owner: 'isolated-user',
    };
    const newer = { ...older, id: 'newer', uploadedAt: '2026-02-01T00:00:00.000Z' };
    repository.save(older);
    repository.save(newer);
    assert.deepStrictEqual(service.list('isolated-user').map((item) => item.id), ['newer', 'older']);
    assert.strictEqual(service.list('isolated-user')[0].storageName, undefined);
    await assert.rejects(service.download('older', 'test-user'), { code: 'DOCUMENT_NOT_FOUND' });
    const response = await fetch(`${baseUrl}/documents/older/download`);
    assert.strictEqual(response.status, 404);
    assert.strictEqual((await response.json()).error.code, 'DOCUMENT_NOT_FOUND');
    const listResponse = await fetch(`${baseUrl}/documents`);
    assert.deepStrictEqual(await listResponse.json(), { documents: [document] });
  });

  await context.test('trata falha de gravação sem expor o caminho local', async () => {
    await rm(storageDir, { recursive: true, force: true });
    await writeFile(storageDir, 'bloqueia a criação do diretório');
    const form = new FormData();
    form.append('file', new Blob([content]), 'relatorio.txt');
    const response = await fetch(`${baseUrl}/upload`, { method: 'POST', body: form });
    assert.strictEqual(response.status, 500);
    const body = await response.json();
    assert.strictEqual(body.error.code, 'UPLOAD_FAILED');
    assert.ok(!JSON.stringify(body).includes(storageDir));
    const listResponse = await fetch(`${baseUrl}/documents`);
    assert.deepStrictEqual(await listResponse.json(), { documents: [document] });
  });
});
