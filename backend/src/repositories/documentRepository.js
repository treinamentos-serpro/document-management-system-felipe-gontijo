const documents = new Map();

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

module.exports = { save, findById, findByOwner };