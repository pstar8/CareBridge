import { useState } from 'react';
import { CheckCircle, Calendar, Pill, HelpCircle, BookOpen, MessageSquare, Bookmark, Languages } from 'lucide-react';
import SafetyBanner from '../components/SafetyBanner';
import ReadAloudButton from '../components/ReadAloudButton';
import ReadableText from '../components/ReadableText';
import { languages, languageCodes, mockResults, mockTranslations } from '../data/mockData';
import { getSettings, addNotification } from '../utils/storage';

function Section({ icon: Icon, title, color = 'text-teal-600', children }) {
  return <div className="card"><div className="flex items-center gap-2 mb-4"><Icon size={18} className={color} /><h2 className="font-display font-semibold text-slate-800">{title}</h2></div>{children}</div>;
}

export default function Results() {
  const [apptSaved, setApptSaved] = useState(false);
  const [medSaved, setMedSaved] = useState(false);
  const [language, setLanguage] = useState(getSettings().preferredLanguage || 'urdu');
  const r = mockResults;
  const translation = mockTranslations[language] || mockTranslations.urdu;
  const languageLabel = languages.find(l => l.value === language)?.label || 'Selected language';

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div><div className="flex items-center gap-2 mb-1"><span className="badge badge-teal">AI Analysis Complete</span><span className="badge badge-gray">{r.documentType}</span></div><h1 className="font-display font-bold text-2xl text-slate-800">Your Results</h1><p className="text-sm text-slate-500 mt-0.5">Based on your uploaded document – sample blood test result</p></div>
        <ReadAloudButton text={r.summary + ' ' + r.keyActions.join('. ')} languageCode="en-GB" />
      </div>
      <SafetyBanner compact />
      <div className="card flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div className="flex items-center gap-2"><Languages size={18} className="text-teal-600"/><div><p className="font-semibold text-sm text-slate-800">Translate explanation</p><p className="text-xs text-slate-500">Default language comes from Settings.</p></div></div><select value={language} onChange={e => setLanguage(e.target.value)} className="text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-teal-400 bg-white text-slate-700">{languages.filter(l => ['urdu','brazilian_portuguese','french','japanese'].includes(l.value)).map(l => <option key={l.value} value={l.value}>{l.label}</option>)}</select></div>
      <Section icon={BookOpen} title="Simple English Summary"><ReadableText text={r.summary} languageCode="en-GB" label="Read English section" compact /></Section>
      <Section icon={Languages} title={`${languageLabel} Translation`} color="text-teal-600"><div className="bg-teal-50 border border-teal-100 rounded-lg p-3"><ReadableText text={translation} languageCode={languageCodes[language] || 'en-GB'} label={`Read ${languageLabel} section`} compact textClassName="text-sm text-teal-800 leading-relaxed" /></div></Section>
      <Section icon={CheckCircle} title="What You Should Do" color="text-green-600"><div className="mb-3"><ReadAloudButton text={r.keyActions.join('. ')} languageCode="en-GB" label="Read actions" compact /></div><ul className="space-y-2">{r.keyActions.map((action,i)=><li key={i} className="flex items-start gap-2.5 text-sm text-slate-700"><CheckCircle size={16} className="text-green-500 shrink-0 mt-0.5" />{action}</li>)}</ul></Section>
      <Section icon={BookOpen} title="Medical Terms Explained" color="text-blue-600"><div className="mb-3"><ReadAloudButton text={r.medicalTerms.map(t => `${t.term}: ${t.explanation}`).join('. ')} languageCode="en-GB" label="Read terms" compact /></div><div className="space-y-3">{r.medicalTerms.map((term,i)=><div key={i} className="bg-slate-50 rounded-lg p-3"><p className="font-semibold text-sm text-slate-800 mb-0.5">{term.term}</p><p className="text-sm text-slate-600 leading-relaxed">{term.explanation}</p></div>)}</div></Section>
      <Section icon={HelpCircle} title="Questions to Ask Your Doctor" color="text-purple-600"><div className="mb-3"><ReadAloudButton text={r.suggestedQuestions.join('. ')} languageCode="en-GB" label="Read questions" compact /></div><ul className="space-y-2">{r.suggestedQuestions.map((q,i)=><li key={i} className="flex items-start gap-2.5 text-sm text-slate-700 bg-purple-50 rounded-lg px-3 py-2"><MessageSquare size={14} className="text-purple-400 shrink-0 mt-0.5" />{q}</li>)}</ul></Section>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="card border-blue-200 bg-blue-50/50"><div className="flex items-center gap-2 mb-3"><Calendar size={18} className="text-blue-600" /><h2 className="font-display font-semibold text-slate-800">Possible Appointment Found</h2></div><div className="bg-white border border-blue-100 rounded-lg p-4 space-y-1.5 mb-4"><p className="font-semibold text-slate-800">{r.possibleAppointment.title}</p><p className="text-sm text-slate-600">{r.possibleAppointment.date} at {r.possibleAppointment.time}</p><p className="text-sm text-slate-600">{r.possibleAppointment.location}</p><span className="badge badge-blue text-xs">{r.possibleAppointment.type}</span></div><button onClick={() => {setApptSaved(true); addNotification('Appointment saved from document', 'appointment');}} disabled={apptSaved} className="btn-secondary text-sm flex items-center gap-2"><Bookmark size={14} className={apptSaved ? 'fill-current' : ''} />{apptSaved ? 'Appointment Saved ✓' : 'Save Appointment'}</button></div>
        <div className="card border-purple-200 bg-purple-50/50"><div className="flex items-center gap-2 mb-3"><Pill size={18} className="text-purple-600" /><h2 className="font-display font-semibold text-slate-800">Possible Medication Found</h2></div><div className="bg-white border border-purple-100 rounded-lg p-4 space-y-1.5 mb-4"><p className="font-semibold text-slate-800">{r.possibleMedication.name} {r.possibleMedication.dose}</p><p className="text-sm text-slate-600">{r.possibleMedication.frequency}</p><span className="badge badge-yellow text-xs">{r.possibleMedication.status}</span></div><button onClick={() => {setMedSaved(true); addNotification('Medication saved from document', 'medication');}} disabled={medSaved} className="btn-secondary text-sm flex items-center gap-2"><Bookmark size={14} className={medSaved ? 'fill-current' : ''} />{medSaved ? 'Medication Saved ✓' : 'Save Medication'}</button></div>
      </div>
      <SafetyBanner />
    </div>
  );
}
