const path = require('node:path');
const { randomUUID } = require('node:crypto');

class DocumentNotFoundError extends Error {}

function createDocumentService(repository) {
  return {
    registerUpload(file, owner) {
      const originalName = path.basename(file.originalname).replace(/[\0\r\n]/g, '_') || 'document';
      const document = {
        id: randomUUID(),
        originalName,
        storageName: file.filename,
        size: file.size,
        mimeType: file.mimetype || 'application/octet-stream',
        uploadedAt: new Date().toISOString(),
        owner
      };

      repository.add(document);
      return toPublicDocument(document);
    },

    listDocuments(owner) {
      return repository.listByOwner(owner)
        .sort((first, second) => second.uploadedAt.localeCompare(first.uploadedAt))
        .map(toPublicDocument);
    },

    async getDownload(id, owner) {
      const document = repository.findByIdAndOwner(id, owner);
      if (!document) throw new DocumentNotFoundError();

      const filePath = await repository.getFilePath(document);
      if (!filePath) throw new DocumentNotFoundError();

      return { document: toPublicDocument(document), filePath };
    }
  };
}

function toPublicDocument(document) {
  const { storageName, ...publicDocument } = document;
  return publicDocument;
}

module.exports = { createDocumentService, DocumentNotFoundError };