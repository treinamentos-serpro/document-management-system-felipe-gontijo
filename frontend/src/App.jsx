import { useEffect, useState } from 'react';
import { DocumentList } from './components/DocumentList.jsx';
import { UploadComponent } from './components/UploadComponent.jsx';
import { downloadDocument, listDocuments, uploadDocument } from './services/documentService.js';
import './App.css';

export default function App() {
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    let isActive = true;

    listDocuments()
      .then((result) => {
        if (isActive) setDocuments(result);
      })
      .catch((error) => {
        if (isActive) setErrorMessage(error.message);
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, []);

  async function handleUpload(file) {
    setIsUploading(true);
    setErrorMessage('');
    setStatusMessage('');

    try {
      await uploadDocument(file);
      setDocuments(await listDocuments());
      setStatusMessage('Documento enviado com sucesso.');
      return true;
    } catch (error) {
      setErrorMessage(error.message);
      return false;
    } finally {
      setIsUploading(false);
    }
  }

  async function handleDownload(document) {
    setDownloadingId(document.id);
    setErrorMessage('');

    try {
      await downloadDocument(document);
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <main className="workspace">
      <header className="topbar">
        <a className="wordmark" href="/" aria-label="DMS, início">
          <span className="wordmark-mark" aria-hidden="true">D</span>
          <span>DMS <span className="wordmark-light">/ arquivos</span></span>
        </a>
        <span className="local-indicator"><span aria-hidden="true" />Armazenamento local</span>
      </header>

      <section className="page-heading" aria-labelledby="page-title">
        <p className="eyebrow">ESPAÇO DE TRABALHO</p>
        <h1 id="page-title">Seus documentos</h1>
        <p className="page-description">Envie e acesse seus arquivos em um só lugar.</p>
      </section>

      <section className="upload-section" aria-labelledby="upload-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">ADICIONAR ARQUIVO</p>
            <h2 id="upload-title">Novo documento</h2>
          </div>
          <span className="size-note">Limite de 10 MB</span>
        </div>
        <UploadComponent onUpload={handleUpload} isUploading={isUploading} />
      </section>

      {(errorMessage || statusMessage) && (
        <div className={`notice ${errorMessage ? 'notice-error' : 'notice-success'}`} role={errorMessage ? 'alert' : 'status'}>
          {errorMessage || statusMessage}
        </div>
      )}

      <section className="documents-section" aria-labelledby="documents-title">
        <div className="section-heading documents-heading">
          <div>
            <p className="eyebrow">BIBLIOTECA</p>
            <h2 id="documents-title">Arquivos enviados</h2>
          </div>
          <span className="document-count">{documents.length} {documents.length === 1 ? 'arquivo' : 'arquivos'}</span>
        </div>
        <DocumentList
          documents={documents}
          isLoading={isLoading}
          downloadingId={downloadingId}
          onDownload={handleDownload}
        />
      </section>
    </main>
  );
}