import { FileText, FolderOpen, LoaderCircle, RefreshCw } from 'lucide-react';
import DownloadButton from './DownloadButton.jsx';

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short', timeStyle: 'short',
});
const sizeFormatter = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${sizeFormatter.format(bytes / 1024)} KB`;
  return `${sizeFormatter.format(bytes / (1024 * 1024))} MB`;
}

export default function DocumentList({ documents, isLoading, error, onRefresh }) {
  return (
    <section className="documents-section" aria-labelledby="documents-heading" aria-busy={isLoading}>
      <div className="section-heading">
        <h2 id="documents-heading">Meus documentos <span className="document-count">{documents.length}</span></h2>
        <button
          className="icon-button"
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          aria-label="Atualizar documentos"
          title="Atualizar documentos"
        >
          <RefreshCw size={19} className={isLoading ? 'spin' : undefined} />
        </button>
      </div>
      {error && <p className="error-message" role="alert">{error}</p>}
      {isLoading && <p className="loading-message" role="status"><LoaderCircle className="spin" size={18} /> Carregando documentos...</p>}
      {!isLoading && !error && documents.length === 0 && (
        <div className="empty-state"><FolderOpen size={36} /><p>Nenhum documento enviado.</p></div>
      )}
      {documents.length > 0 && (
        <table className="document-table">
          <thead><tr><th scope="col">Documento</th><th scope="col">Tamanho</th><th scope="col">Enviado em</th><th scope="col"><span className="sr-only">Download</span></th></tr></thead>
          <tbody>
            {documents.map((document) => (
              <tr key={document.id}>
                <td className="document-name"><FileText size={20} /><span>{document.originalName}</span></td>
                <td>{formatSize(document.size)}</td>
                <td><time dateTime={document.uploadedAt}>{dateFormatter.format(new Date(document.uploadedAt))}</time></td>
                <td><DownloadButton document={document} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}