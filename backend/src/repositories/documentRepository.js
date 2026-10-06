const fs = require('node:fs/promises');
const path = require('node:path');

function createDocumentRepository({ storageDir }) {
  const documents = new Map();

  return {
    add(document) {
      documents.set(document.id, document);
    },

    listByOwner(owner) {
      return [...documents.values()].filter((document) => document.owner === owner);
    },

    findByIdAndOwner(id, owner) {
      const document = documents.get(id);
      return document && document.owner === owner ? document : null;
    },

    async getFilePath(document) {
      const filePath = path.join(storageDir, document.storageName);
      try {
        await fs.access(filePath);
        return filePath;
      } catch {
        return null;
      }
    }
  };
}

module.exports = { createDocumentRepository };