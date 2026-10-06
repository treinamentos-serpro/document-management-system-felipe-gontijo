const { randomUUID } = require('node:crypto');
const repository = require('../repositories/documentRepository');

function toMetadata(document) {
  return {
    id: document.id,
    originalName: document.originalName,
    size: document.size,
    mimeType: document.mimeType,
    uploadedAt: document.uploadedAt,
    owner: document.owner,
  };
}

function upload(file, owner) {
  const document = repository.save({
    id: randomUUID(),
    originalName: file.originalname,
    storageName: file.filename,
    size: file.size,
    mimeType: file.mimetype || 'application/octet-stream',
    uploadedAt: new Date().toISOString(),
    owner,
  });
  return toMetadata(document);
}

function list(owner) {
  return repository.findByOwner(owner)
    .sort((first, second) => second.uploadedAt.localeCompare(first.uploadedAt))
    .map(toMetadata);
}

function notFound() {
  return Object.assign(new Error('Documento não encontrado.'), {
    statusCode: 404,
    code: 'DOCUMENT_NOT_FOUND',
  });
}

async function download(id, owner) {
  const document = repository.findById(id);
  if (!document || document.owner !== owner) throw notFound();
  const filePath = await repository.findFile(document.storageName);
  if (!filePath) throw notFound();
  return { filePath, originalName: document.originalName, mimeType: document.mimeType };
}

async function prepareStorage() {
  return repository.prepareStorage();
}

module.exports = { upload, list, download, prepareStorage };