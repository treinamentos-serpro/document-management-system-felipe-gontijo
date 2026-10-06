async function readError(response) {
  try {
    const result = await response.json();
    return result.error?.message || 'Ocorreu um erro ao comunicar com o servidor.';
  } catch {
    return 'Ocorreu um erro ao comunicar com o servidor.';
  }
}

async function ensureSuccess(response) {
  if (!response.ok) throw new Error(await readError(response));
  return response;
}

export async function listDocuments() {
  const response = await ensureSuccess(await fetch('/api/documents'));
  const result = await response.json();
  return result.documents;
}

export async function uploadDocument(file) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await ensureSuccess(await fetch('/api/upload', {
    method: 'POST',
    body: formData
  }));
  return response.json();
}

export async function downloadDocument(document) {
  const response = await ensureSuccess(await fetch(`/api/documents/${encodeURIComponent(document.id)}/download`));
  const fileBlob = await response.blob();
  const downloadUrl = URL.createObjectURL(fileBlob);
  const link = window.document.createElement('a');
  link.href = downloadUrl;
  link.download = document.originalName;
  link.click();
  URL.revokeObjectURL(downloadUrl);
}