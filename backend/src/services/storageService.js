const fs = require('node:fs/promises');
const path = require('node:path');
const { validateStorageName } = require('./documentValidator');
const errors = require('./errorFactory');

const storageDir = process.env.DMS_STORAGE_DIR
  ? path.resolve(process.env.DMS_STORAGE_DIR)
  : path.resolve(__dirname, '../../storage');

async function prepareStorage() {
  await fs.mkdir(storageDir, { recursive: true });
  return storageDir;
}

function getFilePath(storageName) {
  validateStorageName(storageName);
  const filePath = path.resolve(storageDir, path.basename(storageName));
  if (path.dirname(filePath) !== storageDir) throw errors.invalidStorageName();
  return filePath;
}

async function findFile(storageName) {
  const filePath = getFilePath(storageName);
  try {
    const stats = await fs.lstat(filePath);
    return stats.isFile() ? filePath : null;
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return null;
    throw error;
  }
}

async function removeFile(storageName) {
  await fs.unlink(getFilePath(storageName)).catch((error) => {
    if (error.code !== 'ENOENT') throw error;
  });
}

module.exports = { prepareStorage, getFilePath, findFile, removeFile };
