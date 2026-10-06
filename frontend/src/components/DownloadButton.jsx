import { useState } from 'react';
import { Download, LoaderCircle } from 'lucide-react';
import { downloadDocument } from '../services/documentApi.js';

export default function DownloadButton({ document }) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState('');

  async function handleDownload() {
    if (isDownloading) return;
    setIsDownloading(true);
    setError('');
    try {
      const blob = await downloadDocument(document.id);
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = document.originalName;
      window.document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (failure) {
      setError(failure.message);
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <div className="download-action">
      <button
        className="icon-button"
        type="button"
        onClick={handleDownload}
        disabled={isDownloading}
        aria-label={`${isDownloading ? 'Baixando' : 'Baixar'} ${document.originalName}`}
        title={isDownloading ? 'Baixando...' : 'Baixar documento'}
      >
        {isDownloading ? <LoaderCircle className="spin" size={19} /> : <Download size={19} />}
      </button>
      {error && <p className="error-message" role="alert">{error}</p>}
    </div>
  );
}