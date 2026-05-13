import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ChevronDown } from 'lucide-react';
import UploadBox from '../components/UploadBox';
import SafetyBanner from '../components/SafetyBanner';
import { addNotification } from '../utils/storage';
import { supabase } from '../lib/supabase';

const documentTypes = [
  { value: 'letter', label: 'Medical Letter' },
  { value: 'test_result', label: 'Test Result' },
  { value: 'medication', label: 'Medication Note' },
  { value: 'appointment', label: 'Appointment Note' },
];

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

async function uploadDocument(file, docType) {
  const timestamp   = Date.now();
  const safeName    = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `${timestamp}_${safeName}`;

  const { error: storageError } = await supabase.storage
    .from('uploads')
    .upload(storagePath, file, { cacheControl: '3600', upsert: false, contentType: file.type });

  if (storageError) throw new Error(`Storage error: ${storageError.message}`);

  const { data: signedData, error: signedError } = await supabase.storage
    .from('uploads')
    .createSignedUrl(storagePath, 3600);

  if (signedError) throw new Error(`Signed URL error: ${signedError.message}`);

  const { data, error: dbError } = await supabase
    .from('documents')
    .insert({ filename: file.name, storage_path: storagePath, file_type: docType, status: 'uploaded' })
    .select()
    .single();

  if (dbError) throw new Error(`Database error: ${dbError.message}`);

  return { ...data, signed_url: signedData.signedUrl };
}

async function processDocument(doc, language) {
  const response = await fetch(`${API_BASE}/process`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      document_id:  doc.id,
      storage_path: doc.storage_path,
      file_url:     doc.signed_url,
      file_type:    doc.file_type,
      language,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(err.detail || `Server error ${response.status}`);
  }

  return response.json();
}

export default function UploadLetter() {
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const [docType, setDocType] = useState('');
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState(null);

  const handleGenerate = async () => {
    if (!docType) {
      addNotification('Please select a document type', 'error');
      return;
    }

    if (!file && !text.trim()) {
      addNotification('Please upload a file or paste text', 'error');
      return;
    }

    setLoading(true);
    try {
      let uploadedDoc;

      if (file) {
        uploadedDoc = await uploadDocument(file, docType);
      } else {
        const blob = new Blob([text], { type: 'text/plain' });
        const textFile = new File([blob], 'pasted-text.txt', { type: 'text/plain' });
        uploadedDoc = await uploadDocument(textFile, docType);
      }

      const result = await processDocument(uploadedDoc, 'en');

      addNotification('AI explanation generated from uploaded document', 'ai');

      
      setTimeout(() => navigate('/results', {
        state: { result, documentId: uploadedDoc.id },
      }), 900);
    } catch (error) {
      console.error('Error:', error);
      addNotification(`Error: ${error.message}`, 'error');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="font-display font-bold text-2xl text-slate-800 mb-1">Upload Medical Document</h1>
        <p className="text-slate-500 text-sm">Upload a file or paste a medical letter to get a clear explanation. Translation is selected on the results page or in Settings.</p>
      </div>

      <div className="card">
        <h2 className="font-semibold text-slate-700 text-sm mb-3 flex items-center gap-2">
          <span className="w-6 h-6 bg-teal-100 text-teal-700 rounded-full flex items-center justify-center text-xs font-bold">1</span>
          Upload a file (optional)
        </h2>
        <UploadBox onFileSelect={setFile} />
      </div>

      <div className="card">
        <h2 className="font-semibold text-slate-700 text-sm mb-3 flex items-center gap-2">
          <span className="w-6 h-6 bg-teal-100 text-teal-700 rounded-full flex items-center justify-center text-xs font-bold">2</span>
          Or paste the text from your letter
        </h2>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          rows={7}
          placeholder="Paste the text from your medical letter, test result, medication note, or appointment letter here..."
          className="w-full text-sm border border-slate-200 rounded-lg p-3 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-50 resize-none text-slate-700 placeholder-slate-400"
        />
      </div>

      <div className="card">
        <h2 className="font-semibold text-slate-700 text-sm mb-3 flex items-center gap-2">
          <span className="w-6 h-6 bg-teal-100 text-teal-700 rounded-full flex items-center justify-center text-xs font-bold">3</span>
          Choose document type
        </h2>
        <div className="relative">
          <select
            value={docType}
            onChange={e => setDocType(e.target.value)}
            className="w-full appearance-none text-sm border border-slate-200 rounded-lg px-3 py-2.5 pr-9 outline-none focus:border-teal-400 bg-white text-slate-700"
          >
            <option value="">Select type...</option>
            {documentTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
      </div>

      <SafetyBanner compact />

      <button
        onClick={handleGenerate}
        disabled={loading}
        className="w-full btn-primary py-3 text-base flex items-center justify-center gap-2 disabled:opacity-60"
      >
        {loading
          ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Generating explanation...</>
          : <><Sparkles size={18} />Generate Explanation</>
        }
      </button>
    </div>
  );
}