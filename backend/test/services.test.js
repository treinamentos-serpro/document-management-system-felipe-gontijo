const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { mkdtempSync } = require('node:fs');
const { writeFile, readFile, mkdir, rm, symlink } = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const temporaryDir = mkdtempSync(path.join(os.tmpdir(), 'dms-services-'));
const previousStorageDir = process.env.DMS_STORAGE_DIR;
process.env.DMS_STORAGE_DIR = path.join(temporaryDir, 'storage');
const storage = require('../src/services/storageService');
const validator = require('../src/services/documentValidator');
const mapper = require('../src/services/documentMapper');
const service = require('../src/services/documentService');
const repository = require('../src/repositories/documentRepository');
const ApiError = require('../src/errors/ApiError');
const errors = require('../src/services/errorFactory');
const controller = require('../src/controllers/documentController');
const multer = require('multer');

after(async () => {
  await rm(temporaryDir, { recursive: true, force: true });
  if (previousStorageDir === undefined) delete process.env.DMS_STORAGE_DIR;
  else process.env.DMS_STORAGE_DIR = previousStorageDir;
});

test('centraliza erros sem compartilhar instâncias mutáveis', () => {
  const error = errors.documentNotFound();
  assert.ok(error instanceof ApiError);
  assert.ok(error instanceof Error);
  assert.equal(error.statusCode, 404);
  assert.equal(error.code, 'DOCUMENT_NOT_FOUND');
  assert.equal(error.message, 'Documento não encontrado.');
  assert.notEqual(error, errors.documentNotFound());
});

test('valida UUIDs e preserva 404 para identificadores inválidos', () => {
  validator.validateId(randomUUID());
  validator.validateId(randomUUID().toUpperCase());
  for (const id of [undefined, null, 123, 'unknown', '../secret', 'a'.repeat(36)]) {
    assert.throws(() => validator.validateId(id), { code: 'DOCUMENT_NOT_FOUND', statusCode: 404 });
  }
});

test('valida arquivo e proprietário antes de salvar metadados', () => {
  const file = { originalname: 'relatorio.txt', filename: randomUUID(), size: 0 };
  validator.validateFile(file);
  assert.throws(() => service.upload(undefined, 'user'), { code: 'FILE_REQUIRED' });
  for (const invalid of [
    { ...file, size: -1 }, { ...file, size: NaN },
    { ...file, originalname: '' }, { ...file, mimetype: {} },
  ]) {
    assert.throws(() => service.upload(invalid, 'user'), { code: 'INVALID_FILE' });
  }
  for (const owner of [undefined, null, '', ' ', 123]) {
    assert.throws(() => service.upload(file, owner), { code: 'INVALID_OWNER' });
    assert.throws(() => service.list(owner), { code: 'INVALID_OWNER' });
  }
  assert.deepEqual(service.list('user'), []);
});

test('mapeia somente os campos públicos, incluindo campos futuros', () => {
  const metadata = {
    id: randomUUID(), originalName: 'relatorio.txt', size: 1,
    mimeType: 'text/plain', uploadedAt: new Date().toISOString(), owner: 'user',
  };
  assert.deepEqual(mapper.toMetadata({
    ...metadata, storageName: 'private', filePath: '/private', path: '/private', secret: 'private',
  }), metadata);
});

test('rejeita traversal no caminho e na limpeza, sem tocar arquivos externos', async () => {
  const directory = await storage.prepareStorage();
  const outside = path.join(temporaryDir, 'secret.txt');
  await writeFile(outside, 'externo');
  for (const name of [
    '../secret.txt', '..\\secret.txt', outside, '/etc/passwd', 'C:\\secret.txt',
    'folder/file', 'folder\\file', '.', '..', '', ' ', 'file\0.txt', undefined, 123,
  ]) {
    assert.throws(() => storage.getFilePath(name), { code: 'INVALID_STORAGE_NAME' });
    await assert.rejects(storage.findFile(name), { code: 'INVALID_STORAGE_NAME' });
    await assert.rejects(storage.removeFile(name), { code: 'INVALID_STORAGE_NAME' });
  }
  assert.equal(await readFile(outside, 'utf8'), 'externo');
  assert.equal(storage.getFilePath('safe-file'), path.join(directory, 'safe-file'));
});

test('storage local suporta leitura e limpeza e não segue links simbólicos', async () => {
  const directory = await storage.prepareStorage();
  await writeFile(path.join(directory, 'file'), 'conteúdo');
  assert.equal(await storage.findFile('file'), path.join(directory, 'file'));
  await mkdir(path.join(directory, 'folder'));
  assert.equal(await storage.findFile('folder'), null);
  await symlink(path.join(temporaryDir, 'outside'), path.join(directory, 'link'));
  assert.equal(await storage.findFile('link'), null);
  await storage.removeFile('file');
  await storage.removeFile('file');
  assert.equal(await storage.findFile('file'), null);
});

test('serviço mantém upload síncrono e autoriza download antes de acessar storage', async () => {
  const directory = await service.prepareStorage();
  const filename = randomUUID();
  await writeFile(path.join(directory, filename), 'conteúdo');
  const document = service.upload({
    originalname: 'relatorio.txt', filename, size: 9,
  }, 'owner');
  assert.equal(document.mimeType, 'application/octet-stream');
  assert.equal(document.storageName, undefined);
  assert.deepEqual(service.list('owner'), [document]);
  await assert.rejects(service.download(document.id, 'other'), { code: 'DOCUMENT_NOT_FOUND' });
  await assert.rejects(service.download(document.id, ''), { code: 'INVALID_OWNER' });
  assert.deepEqual(await service.download(document.id, 'owner'), {
    filePath: path.join(directory, filename), originalName: 'relatorio.txt',
    mimeType: 'application/octet-stream',
  });
  const maliciousId = randomUUID();
  repository.save({ id: maliciousId, owner: 'owner', storageName: '../secret.txt' });
  await assert.rejects(service.download(maliciousId, 'other'), { code: 'DOCUMENT_NOT_FOUND' });
  await assert.rejects(service.download(maliciousId, 'owner'), { code: 'INVALID_STORAGE_NAME' });
  await storage.removeFile(filename);
  await assert.rejects(service.download(document.id, 'owner'), { code: 'DOCUMENT_NOT_FOUND' });
  await assert.rejects(service.download(randomUUID(), 'owner'), { code: 'DOCUMENT_NOT_FOUND' });
});

test('middleware unifica ApiError, MulterError e erros genéricos sem vazar detalhes', () => {
  for (const [error, request, status, code] of [
    [errors.documentNotFound(), {}, 404, 'DOCUMENT_NOT_FOUND'],
    [new multer.MulterError('LIMIT_FILE_SIZE'), {}, 413, 'FILE_TOO_LARGE'],
    [new multer.MulterError('LIMIT_FILE_COUNT'), {}, 400, 'FILE_REQUIRED'],
    [new multer.MulterError('LIMIT_UNEXPECTED_FILE'), {}, 400, 'FILE_REQUIRED'],
    [new Error('/private/path'), { method: 'POST', path: '/upload' }, 500, 'UPLOAD_FAILED'],
    [new Error('/private/path'), { method: 'GET', path: '/documents/id/download' }, 500, 'DOWNLOAD_FAILED'],
    [new Error('/private/path'), { method: 'GET', path: '/documents' }, 500, 'INTERNAL_ERROR'],
  ]) {
    const response = {
      status(value) { assert.equal(value, status); return this; },
      json(body) {
        assert.equal(body.error.code, code);
        assert.ok(!JSON.stringify(body).includes('/private/path'));
      },
    };
    controller.handleError(error, request, response, () => assert.fail('não deve delegar'));
  }
  const error = new Error('falha após headers');
  controller.handleError(error, {}, { headersSent: true }, (received) => assert.equal(received, error));
});
