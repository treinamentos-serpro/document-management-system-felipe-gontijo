const { randomUUID } = require('node:crypto');
const repository = require('../repositories/documentRepository');
const { toMetadata } = require('./documentMapper');
const validator = require('./documentValidator');
const storage = require('./storageService');
const errors = require('./errorFactory');

function upload(file, owner) {
  validator.validateFile(file);
  validator.validateOwner(owner);
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
  validator.validateOwner(owner);
  return repository.findByOwner(owner)
    .sort((first, second) => second.uploadedAt.localeCompare(first.uploadedAt))
    .map(toMetadata);
}

async function download(id, owner) {
  validator.validateId(id);
  validator.validateOwner(owner);
  const document = repository.findById(id);
  if (!document || document.owner !== owner) throw errors.documentNotFound();
  const filePath = await storage.findFile(document.storageName);
  if (!filePath) throw errors.documentNotFound();
  return { filePath, originalName: document.originalName, mimeType: document.mimeType };
}

async function prepareStorage() {
  return storage.prepareStorage();
}

module.exports = { upload, list, download, prepareStorage };