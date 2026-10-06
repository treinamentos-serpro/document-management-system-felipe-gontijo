function formatSize(size) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(date) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(date));
}

export function DocumentList({ documents, isLoading, downloadingId, onDownload }) {
  if (isLoading) return <p className="list-message">Carregando documentos...</p>;
  if (documents.length === 0) {
    return <p className="list-message empty-message">Nenhum documento enviado ainda.</p>;
  }

  return (
    <div className="table-wrap">
      <table className="document-table">
        <thead>
          <tr>
            <th scope="col">Nome</th>
            <th scope="col">Tamanho</th>
            <th scope="col">Data de envio</th>
            <th scope="col"><span className="visually-hidden">Ações</span></th>
          </tr>
        </thead>
        <tbody>
          {documents.map((document) => (
            <tr key={document.id}>
              <td>
                <span className="document-name">{document.originalName}</span>
                <span className="document-type">{document.mimeType}</span>
              </td>
              <td>{formatSize(document.size)}</td>
              <td>{formatDate(document.uploadedAt)}</td>
              <td className="action-cell">
                <button
                  className="download-button"
                  type="button"
                  onClick={() => onDownload(document)}
                  disabled={downloadingId !== null}
                  aria-label={`Baixar ${document.originalName}`}
                >
                  {downloadingId === document.id ? 'Baixando...' : 'Baixar'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}