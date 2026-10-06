const errors = require('./errorFactory');

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validateId(id) {
  // IDs inválidos mantêm o mesmo contrato de documentos inexistentes.
  if (typeof id !== 'string' || !uuidPattern.test(id)) throw errors.documentNotFound();
}

function validateStorageName(storageName) {
  if (typeof storageName !== 'string' || !storageName.trim()
    || storageName === '.' || storageName === '..' || /[/\\:\0]/.test(storageName)) {
    throw errors.invalidStorageName();
  }
}

function validateOwner(owner) {
  if (typeof owner !== 'string' || !owner.trim()) throw errors.invalidOwner();
}

function validateFile(file) {
  if (!file) throw errors.fileRequired();
  if (typeof file.originalname !== 'string' || !file.originalname.trim()
    || !Number.isSafeInteger(file.size) || file.size < 0
    || (file.mimetype !== undefined && typeof file.mimetype !== 'string')) {
    throw errors.invalidFile();
  }
  validateStorageName(file.filename);
}

module.exports = { validateId, validateStorageName, validateOwner, validateFile };
