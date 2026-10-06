import { useRef, useState } from 'react';

export function UploadComponent({ onUpload, isUploading }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [formError, setFormError] = useState('');
  const inputRef = useRef(null);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!selectedFile) {
      setFormError('Selecione um arquivo para continuar.');
      return;
    }

    setFormError('');
    const didUpload = await onUpload(selectedFile);
    if (!didUpload) return;

    setSelectedFile(null);
    inputRef.current.value = '';
  }

  return (
    <form className="upload-form" onSubmit={handleSubmit}>
      <label className="file-picker">
        <span className="file-picker-icon" aria-hidden="true">＋</span>
        <span className="file-picker-copy">
          <strong>{selectedFile ? selectedFile.name : 'Escolher arquivo'}</strong>
          <span>{selectedFile ? `${(selectedFile.size / 1024).toFixed(1)} KB` : 'Qualquer formato, até 10 MB'}</span>
        </span>
        <input
          ref={inputRef}
          type="file"
          onChange={(event) => {
            setSelectedFile(event.target.files?.[0] || null);
            setFormError('');
          }}
        />
      </label>
      <button className="primary-button" type="submit" disabled={isUploading || !selectedFile}>
        {isUploading ? 'Enviando...' : 'Enviar documento'}
      </button>
      {formError && <span className="form-error" role="alert">{formError}</span>}
    </form>
  );
}