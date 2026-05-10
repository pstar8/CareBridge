import { useState, useRef } from 'react';
import { Upload, FileText, X } from 'lucide-react';

export default function UploadBox({ onFileSelect }) {
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState(null);
  const inputRef = useRef();

  const handleFile = (f) => {
    setFile(f);
    if (onFileSelect) onFileSelect(f);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
          dragOver ? 'border-teal-400 bg-teal-50' : 'border-slate-200 hover:border-teal-300 hover:bg-slate-50'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
          className="hidden"
          onChange={e => e.target.files[0] && handleFile(e.target.files[0])}
        />
        <Upload size={32} className="text-slate-300 mx-auto mb-3" />
        <p className="font-semibold text-slate-600 text-sm mb-1">Drop your file here or click to browse</p>
        <p className="text-xs text-slate-400">Supports PDF, JPG, PNG, DOC, DOCX</p>
      </div>

      {file && (
        <div className="mt-3 flex items-center gap-2 bg-teal-50 border border-teal-200 rounded-lg px-3 py-2">
          <FileText size={16} className="text-teal-600" />
          <span className="text-sm text-teal-700 flex-1 truncate">{file.name}</span>
          <button onClick={() => { setFile(null); if (onFileSelect) onFileSelect(null); }}>
            <X size={14} className="text-teal-400 hover:text-teal-600" />
          </button>
        </div>
      )}
    </div>
  );
}
