import { useEffect, useState } from 'react';
import { Files } from 'lucide-react';
import UploadComponent from './components/UploadComponent.jsx';
import DocumentList from './components/DocumentList.jsx';
import { listDocuments } from './services/documentApi.js';
import './App.css';

export default function App() {
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshIndex, setRefreshIndex] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError('');
    listDocuments(controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setDocuments(result);
      })
      .catch((failure) => {
        if (!controller.signal.aborted) setError(failure.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });
    return () => controller.abort();
  }, [refreshIndex]);

  function refreshDocuments() {
    setRefreshIndex((previous) => previous + 1);
  }

  return (
    <>
      <header className="app-header"><div className="app-shell brand"><Files size={28} /><h1>Document Management System</h1></div></header>
      <main className="app-shell">
        <UploadComponent onUploaded={refreshDocuments} />
        <DocumentList documents={documents} isLoading={isLoading} error={error} onRefresh={refreshDocuments} />
      </main>
    </>
  );
}
