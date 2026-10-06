import { useState } from 'react';
import { LoaderCircle, Upload } from 'lucide-react';
import { uploadDocument } from '../services/documentApi.js';

export default function UploadComponent({ onUploaded }) {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    if (!file || isUploading) return;
    const form = event.currentTarget;
    setIsUploading(true);
    setError('');
    setMessage('');

    try {
      const document = await uploadDocument(file);
      form.reset();
      setFile(null);
      setMessage(`Documento enviado: ${document.originalName}`);
      onUploaded(document);
    } catch (failure) {
      setError(failure.message);
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <section className="upload-section" aria-labelledby="upload-heading">
      <h2 id="upload-heading">Novo documento</h2>
      <form className="upload-form" onSubmit={handleSubmit} aria-busy={isUploading}>
        <div className="file-field">
          <label htmlFor="document-file">Arquivo</label>
          <input
            id="document-file"
            name="file"
            type="file"
            required
            disabled={isUploading}
            onChange={(event) => {
              setFile(event.target.files[0] || null);
              setError('');
              setMessage('');
            }}
          />
        </div>
        <button className="primary-button" type="submit" disabled={!file || isUploading}>
          {isUploading ? <LoaderCircle className="spin" size={18} /> : <Upload size={18} />}
          {isUploading ? 'Enviando...' : 'Enviar documento'}
        </button>
      </form>
      {error && <p className="error-message" role="alert">{error}</p>}
      {message && <p className="success-message" role="status">{message}</p>}
    </section>
  );
}