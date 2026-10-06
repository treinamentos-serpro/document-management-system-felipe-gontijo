const express = require('express');
const multer = require('multer');
const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { createDocumentRepository } = require('./repositories/documentRepository');
const { createDocumentService, DocumentNotFoundError } = require('./services/documentService');
const { createDocumentController } = require('./controllers/documentController');
const { createDocumentRoutes } = require('./routes/documentRoutes');

function createApp(options = {}) {
  const storageDir = options.storageDir || process.env.DMS_STORAGE_DIR || path.resolve(__dirname, '../storage');
  const ownerId = options.ownerId || process.env.DMS_OWNER_ID || 'local-user';
  const configuredLimit = Number(options.maxFileSizeBytes || process.env.MAX_FILE_SIZE_BYTES || 10485760);
  const maxFileSizeBytes = Number.isSafeInteger(configuredLimit) && configuredLimit > 0
    ? configuredLimit
    : 10485760;
  const repository = createDocumentRepository({ storageDir });
  const service = createDocumentService(repository);
  const controller = createDocumentController(service);
  const storage = multer.diskStorage({
    destination: (request, file, callback) => {
      fs.mkdir(storageDir, { recursive: true }).then(() => callback(null, storageDir), callback);
    },
    filename: (request, file, callback) => callback(null, randomUUID())
  });
  const upload = multer({ storage, limits: { fileSize: maxFileSizeBytes } });
  const app = express();

  app.use(express.json());
  app.use((request, response, next) => {
    request.user = { id: ownerId };
    next();
  });

  app.get('/health', (request, response) => response.json({ status: 'ok' }));
  app.use(createDocumentRoutes({ controller, upload }));
  app.use((error, request, response, next) => {
    if (response.headersSent) return next(error);

    if (error instanceof multer.MulterError) {
      const isTooLarge = error.code === 'LIMIT_FILE_SIZE';
      return response.status(isTooLarge ? 413 : 400).json({
        error: {
          code: isTooLarge ? 'FILE_TOO_LARGE' : 'INVALID_UPLOAD',
          message: isTooLarge
            ? 'O arquivo excede o tamanho máximo permitido.'
            : 'Não foi possível processar o arquivo enviado.'
        }
      });
    }

    if (error instanceof DocumentNotFoundError) {
      return response.status(404).json({
        error: { code: 'DOCUMENT_NOT_FOUND', message: 'Documento não encontrado.' }
      });
    }

    const isDownloadError = error && error.operation === 'download';
    return response.status(500).json({
      error: {
        code: isDownloadError ? 'DOWNLOAD_FAILED' : 'UPLOAD_FAILED',
        message: isDownloadError
          ? 'Não foi possível baixar o documento.'
          : 'Não foi possível processar o documento.'
      }
    });
  });

  return app;
}

const app = createApp();
const PORT = process.env.PORT || 3000;

if (require.main === module) {
  app.listen(PORT, () => console.log(`DMS backend ouvindo na porta ${PORT}`));
}

module.exports = app;
module.exports.createApp = createApp;
