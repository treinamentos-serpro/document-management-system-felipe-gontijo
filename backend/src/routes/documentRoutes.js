const express = require('express');
const multer = require('multer');
const { randomUUID } = require('node:crypto');
const controller = require('../controllers/documentController');

const router = express.Router();
const ownerId = process.env.DMS_OWNER_ID || 'local-user';
const maxFileSize = Number(process.env.MAX_FILE_SIZE_BYTES || 10485760);

if (!Number.isSafeInteger(maxFileSize) || maxFileSize <= 0) {
  throw new Error('MAX_FILE_SIZE_BYTES deve ser um inteiro positivo.');
}

const upload = multer({
  storage: multer.diskStorage({
    destination: controller.storageDestination,
    filename(req, file, callback) {
      callback(null, randomUUID());
    },
  }),
  limits: { fileSize: maxFileSize, files: 1 },
});

router.use((req, res, next) => {
  req.user = req.user || { id: ownerId };
  next();
});

router.post('/upload', upload.single('file'), controller.upload);
router.get('/documents', controller.list);
router.get('/documents/:id/download', controller.download);

router.use(controller.handleError);

module.exports = router;