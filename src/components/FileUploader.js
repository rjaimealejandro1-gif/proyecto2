import { useState } from 'react';
import { supabase } from '../supabaseClient';

const FileUploader = ({ onUploadComplete, onRemove, existingFile = null, accept = "*/*", maxSizeMB = 50, bucket = "entregas" }) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [file, setFile] = useState(existingFile);

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType) => {
    if (!mimeType) return '📄';
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.startsWith('video/')) return '🎬';
    if (mimeType.startsWith('audio/')) return '🎵';
    if (mimeType.includes('pdf')) return '📕';
    if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
    if (mimeType.includes('sheet') || mimeType.includes('excel')) return '📊';
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return '📽️';
    if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('archive')) return '📦';
    return '📄';
  };

  const handleFileSelect = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    if (selectedFile.size > maxSizeMB * 1024 * 1024) {
      setError(`El archivo es demasiado grande. Máximo ${maxSizeMB}MB`);
      return;
    }

    setError('');
    setUploading(true);

    try {
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 8);
      const fileName = `${timestamp}_${randomStr}_${selectedFile.name}`;
      const filePath = `${timestamp}/${fileName}`;

      const { data, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      const fileInfo = {
        url: urlData.publicUrl,
        name: selectedFile.name,
        type: selectedFile.type,
        size: selectedFile.size,
        path: filePath,
      };

      setFile(fileInfo);
      if (onUploadComplete) onUploadComplete(fileInfo);
    } catch (err) {
      console.error('Upload error:', err);
      setError('Error al subir el archivo. Intenta de nuevo.');
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    if (file?.path) {
      try {
        await supabase.storage.from(bucket).remove([file.path]);
      } catch (err) {
        console.warn('Error removing file from storage:', err);
      }
    }
    setFile(null);
    if (onRemove) onRemove();
  };

  return (
    <div className="file-uploader">
      <style>{`
        .file-uploader { display: flex; flex-direction: column; gap: 12px; }
        .file-uploader .upload-area {
          border: 2px dashed var(--border-default);
          border-radius: 12px;
          padding: 32px 24px;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s;
          background: var(--bg-subtle);
        }
        .file-uploader .upload-area:hover {
          border-color: var(--accent);
          background: var(--info-subtle);
        }
        .file-uploader .upload-area.dragover {
          border-color: var(--accent);
          background: var(--accent-subtle);
        }
        .file-uploader .upload-icon { font-size: 40px; margin-bottom: 8px; }
        .file-uploader .upload-text { color: var(--text-secondary); font-size: 14px; }
        .file-uploader .upload-text strong { color: var(--accent); }
        .file-uploader .upload-hint { color: var(--text-tertiary); font-size: 12px; margin-top: 4px; }
        .file-uploader .file-input { display: none; }
        .file-uploader .file-preview {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          background: var(--success-subtle);
          border: 1px solid rgba(92, 184, 138, 0.2);
          border-radius: 12px;
        }
        .file-uploader .file-preview .file-icon { font-size: 32px; flex-shrink: 0; }
        .file-uploader .file-preview .file-info { flex: 1; min-width: 0; }
        .file-uploader .file-preview .file-name {
          font-weight: 600;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          font-size: 14px;
        }
        .file-uploader .file-preview .file-meta {
          font-size: 12px;
          color: var(--text-secondary);
          margin-top: 2px;
        }
        .file-uploader .file-preview .file-actions { display: flex; gap: 8px; }
        .file-uploader .file-preview .btn {
          padding: 6px 12px;
          border-radius: 10px;
          border: none;
          cursor: pointer;
          font-size: 12px;
          font-weight: 500;
          transition: all 0.2s;
        }
        .file-uploader .file-preview .btn-remove {
          background: var(--danger-subtle);
          color: var(--danger);
          border: 1px solid rgba(212, 107, 107, 0.2);
        }
        .file-uploader .file-preview .btn-remove:hover {
          background: rgba(212, 107, 107, 0.15);
        }
        .file-uploader .file-preview .btn-download {
          background: var(--info-subtle);
          color: var(--info);
          border: 1px solid rgba(107, 163, 214, 0.2);
          text-decoration: none;
          display: inline-flex;
          align-items: center;
        }
        .file-uploader .file-preview .btn-download:hover {
          background: rgba(107, 163, 214, 0.15);
        }
        .file-uploader .error-msg {
          color: var(--danger);
          font-size: 12px;
          padding: 8px 12px;
          background: var(--danger-subtle);
          border-radius: 10px;
          border: 1px solid rgba(212, 107, 107, 0.2);
        }
        .file-uploader .uploading-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 16px;
          background: var(--info-subtle);
          border: 1px solid rgba(107, 163, 214, 0.2);
          border-radius: 12px;
          color: var(--info);
          font-size: 14px;
        }
        .file-uploader .spinner {
          width: 20px;
          height: 20px;
          border: 2px solid rgba(107, 163, 214, 0.2);
          border-top-color: var(--info);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {error && <div className="error-msg">{error}</div>}

      {uploading && (
        <div className="uploading-indicator">
          <div className="spinner"></div>
          Subiendo archivo...
        </div>
      )}

      {!uploading && !file && (
        <label className="upload-area">
          <input
            type="file"
            className="file-input"
            onChange={handleFileSelect}
            accept={accept}
          />
          <div className="upload-icon">📁</div>
          <div className="upload-text">
            <strong>Haz clic para subir</strong> o arrastra un archivo
          </div>
          <div className="upload-hint">
            Máx. {maxSizeMB}MB • Documentos, imágenes, videos, etc.
          </div>
        </label>
      )}

      {!uploading && file && (
        <div className="file-preview">
          <div className="file-icon">{getFileIcon(file.type)}</div>
          <div className="file-info">
            <div className="file-name" title={file.name}>{file.name}</div>
            <div className="file-meta">
              {formatFileSize(file.size)} • {file.type || 'tipo desconocido'}
            </div>
          </div>
          <div className="file-actions">
            <a
              href={file.url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-download"
            >
              Ver
            </a>
            <button className="btn btn-remove" onClick={handleRemove}>
              Eliminar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUploader;
