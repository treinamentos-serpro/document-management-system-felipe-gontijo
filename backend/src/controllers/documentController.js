const multer = require('multer');
const service = require('../services/documentService');

async function storageDestination(req, file, callback) {
  try {
    callback(null, await service.prepareStorage());
  } catch (error) {
    callback(error);
  }
}

function upload(req, res) {
  if (!req.file) {
    return res.status(400).json({
      error: { code: 'FILE_REQUIRED', message: 'Envie um arquivo no campo file.' },
    });
  }
  return res.status(201).json(service.upload(req.file, req.user.id));
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
      error.statusCode = 404;
      error.code = 'DOCUMENT_NOT_FOUND';
      error.message = 'Documento não encontrado.';
    }
    next(error);
  });
}

function handleError(error, req, res, next) {
  if (res.headersSent) return next(error);

  if (error instanceof multer.MulterError) {
    const tooLarge = error.code === 'LIMIT_FILE_SIZE';
    return res.status(tooLarge ? 413 : 400).json({
      error: {
        code: tooLarge ? 'FILE_TOO_LARGE' : 'FILE_REQUIRED',
        message: tooLarge
          ? 'O arquivo excede o tamanho máximo permitido.'
          : 'Envie apenas um arquivo no campo file.',
      },
    });
  }

  if (error.code === 'DOCUMENT_NOT_FOUND') {
    return res.status(404).json({
      error: { code: error.code, message: 'Documento não encontrado.' },
    });
  }

  const isUpload = req.method === 'POST' && req.path === '/upload';
  const isDownload = req.method === 'GET' && req.path.endsWith('/download');
  return res.status(500).json({
    error: {
      code: isUpload ? 'UPLOAD_FAILED' : isDownload ? 'DOWNLOAD_FAILED' : 'INTERNAL_ERROR',
      message: isUpload
        ? 'Não foi possível enviar o documento.'
        : isDownload ? 'Não foi possível baixar o documento.' : 'Não foi possível concluir a operação.',
    },
  });
}

module.exports = { storageDestination, upload, list, download, handleError };