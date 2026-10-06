const multer = require('multer');
const service = require('../services/documentService');
const ApiError = require('../errors/ApiError');
const errors = require('../services/errorFactory');
const storage = require('../services/storageService');

async function storageDestination(req, file, callback) {
  try {
    callback(null, await service.prepareStorage());
  } catch (error) {
    callback(error);
  }
}

async function upload(req, res) {
  let document;
  try {
    document = service.upload(req.file, req.user.id);
  } catch (error) {
    if (req.file) await storage.removeFile(req.file.filename);
    throw error;
  }
  return res.status(201).json(document);
}

function list(req, res) {
  res.json({ documents: service.list(req.user.id) });
}

async function download(req, res, next) {
  const document = await service.download(req.params.id, req.user.id);
  res.download(document.filePath, document.originalName, {
    headers: { 'Content-Type': document.mimeType },
  }, (error) => {
    if (!error) return;
    if (!res.headersSent && (error.code === 'ENOENT' || error.status === 404)) {
      return next(errors.documentNotFound());
    }
    next(error);
  });
}

function handleError(error, req, res, next) {
  if (res.headersSent) return next(error);

  if (error instanceof multer.MulterError) {
    error = error.code === 'LIMIT_FILE_SIZE' ? errors.fileTooLarge() : errors.unexpectedFile();
  }

  if (!(error instanceof ApiError)) {
    const isUpload = req.method === 'POST' && req.path === '/upload';
    const isDownload = req.method === 'GET' && req.path.endsWith('/download');
    error = isUpload ? errors.uploadFailed()
      : isDownload ? errors.downloadFailed() : errors.internalError();
  }

  return res.status(error.statusCode).json({
    error: { code: error.code, message: error.message },
  });
}

module.exports = { storageDestination, upload, list, download, handleError };