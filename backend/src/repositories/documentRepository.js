const fs = require('node:fs/promises');
const path = require('node:path');

const storageDir = process.env.DMS_STORAGE_DIR
  ? path.resolve(process.env.DMS_STORAGE_DIR)
  : path.resolve(__dirname, '../../storage');
const documents = new Map();

async function prepareStorage() {
  await fs.mkdir(storageDir, { recursive: true });
  return storageDir;
}

function save(document) {
  documents.set(document.id, document);
  return document;
}

function findById(id) {
  return documents.get(id);
}

function findByOwner(owner) {
  return [...documents.values()].filter((document) => document.owner === owner);
}

async function findFile(storageName) {
  const filePath = path.join(storageDir, storageName);
  try {
    const stats = await fs.stat(filePath);
    return stats.isFile() ? filePath : null;
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return null;
    throw error;
  }
}

module.exports = { prepareStorage, save, findById, findByOwner, findFile };