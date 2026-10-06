function createDocumentController(service) {
  return {
    upload(request, response) {
      if (!request.file) {
        return response.status(400).json({
          error: { code: 'FILE_REQUIRED', message: 'Selecione um arquivo para enviar.' }
        });
      }

      const document = service.registerUpload(request.file, request.user.id);
      return response.status(201).json(document);
    },

    list(request, response) {
      return response.json({ documents: service.listDocuments(request.user.id) });
    },

    async download(request, response, next) {
      try {
        const { document, filePath } = await service.getDownload(request.params.id, request.user.id);
        return response.download(filePath, document.originalName, (error) => {
          if (error && !response.headersSent) {
            error.operation = 'download';
            next(error);
          }
        });
      } catch (error) {
        next(error);
      }
    }
  };
}

module.exports = { createDocumentController };