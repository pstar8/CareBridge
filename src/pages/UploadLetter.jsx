import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ChevronDown } from 'lucide-react';
import UploadBox from '../components/UploadBox';
import SafetyBanner from '../components/SafetyBanner';
import { documentTypes } from '../data/mockData';
import { addNotification } from '../utils/storage';

export default function UploadLetter() {
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const [docType, setDocType] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGenerate = () => {
    setLoading(true);
    addNotification('AI explanation generated from uploaded document', 'ai');
    setTimeout(() => navigate('/results'), 900);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div><h1 className="font-display font-bold text-2xl text-slate-800 mb-1">Upload Medical Document</h1><p className="text-slate-500 text-sm">Upload a file or paste a medical letter to get a clear explanation. Translation is selected on the results page or in Settings.</p></div>
      <div className="card"><h2 className="font-semibold text-slate-700 text-sm mb-3 flex items-center gap-2"><span className="w-6 h-6 bg-teal-100 text-teal-700 rounded-full flex items-center justify-center text-xs font-bold">1</span>Upload a file (optional)</h2><UploadBox /></div>
      <div className="card"><h2 className="font-semibold text-slate-700 text-sm mb-3 flex items-center gap-2"><span className="w-6 h-6 bg-teal-100 text-teal-700 rounded-full flex items-center justify-center text-xs font-bold">2</span>Or paste the text from your letter</h2><textarea value={text} onChange={e => setText(e.target.value)} rows={7} placeholder="Paste the text from your medical letter, test result, medication note, or appointment letter here..." className="w-full text-sm border border-slate-200 rounded-lg p-3 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-50 resize-none text-slate-700 placeholder-slate-400" /><p className="text-xs text-slate-400 mt-1.5">Tip: leave this blank and click Generate to see an example result.</p></div>
      <div className="card"><h2 className="font-semibold text-slate-700 text-sm mb-3 flex items-center gap-2"><span className="w-6 h-6 bg-teal-100 text-teal-700 rounded-full flex items-center justify-center text-xs font-bold">3</span>Choose document type</h2><div className="relative"><select value={docType} onChange={e => setDocType(e.target.value)} className="w-full appearance-none text-sm border border-slate-200 rounded-lg px-3 py-2.5 pr-9 outline-none focus:border-teal-400 bg-white text-slate-700"><option value="">Select type...</option>{documentTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select><ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" /></div></div>
      <SafetyBanner compact />
      <button onClick={handleGenerate} disabled={loading} className="w-full btn-primary py-3 text-base flex items-center justify-center gap-2 disabled:opacity-60">{loading ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Generating explanation...</> : <><Sparkles size={18} />Generate Explanation</>}</button>
    </div>
  );
}
