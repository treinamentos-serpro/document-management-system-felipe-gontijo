const ApiError = require('../errors/ApiError');

const documentNotFound = () => new ApiError('DOCUMENT_NOT_FOUND', 'Documento não encontrado.', 404);
const fileRequired = () => new ApiError('FILE_REQUIRED', 'Envie um arquivo no campo file.', 400);
const fileTooLarge = () => new ApiError('FILE_TOO_LARGE', 'O arquivo excede o tamanho máximo permitido.', 413);
const unexpectedFile = () => new ApiError('FILE_REQUIRED', 'Envie apenas um arquivo no campo file.', 400);
const invalidFile = () => new ApiError('INVALID_FILE', 'Arquivo inválido.', 400);
const invalidOwner = () => new ApiError('INVALID_OWNER', 'Proprietário inválido.', 400);
const invalidStorageName = () => new ApiError('INVALID_STORAGE_NAME', 'Nome de armazenamento inválido.', 400);
const uploadFailed = () => new ApiError('UPLOAD_FAILED', 'Não foi possível enviar o documento.');
const downloadFailed = () => new ApiError('DOWNLOAD_FAILED', 'Não foi possível baixar o documento.');
const internalError = () => new ApiError('INTERNAL_ERROR', 'Não foi possível concluir a operação.');

module.exports = {
  documentNotFound, fileRequired, fileTooLarge, unexpectedFile, invalidFile,
  invalidOwner, invalidStorageName, uploadFailed, downloadFailed, internalError,
};
