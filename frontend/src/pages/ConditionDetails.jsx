import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Activity, Pill, Calendar, HelpCircle, FileText, MessageSquare, Languages } from 'lucide-react';
import SafetyBanner from '../components/SafetyBanner';
import ReadAloudButton from '../components/ReadAloudButton';
import ReadableText from '../components/ReadableText';
import ChatBox from '../components/ChatBox';
import { findCondition, relatedMedications, relatedAppointments } from '../utils/dataAccess';
import { KEYS, readStorage, writeStorage, getSettings } from '../utils/storage';
import { languageCodes, conditionTranslationTemplates } from '../data/mockData';
import { useState } from 'react';

export default function ConditionDetails() {
  const { id } = useParams();
  const condition = findCondition(id);
  const [notes, setNotes] = useState(readStorage(KEYS.conditionNotes, {})[id] || '');
  const language = getSettings().preferredLanguage || 'urdu';

  if (!condition) return <div className="max-w-3xl mx-auto text-center py-16"><p className="text-slate-500 text-lg mb-4">Condition not found.</p><Link to="/conditions" className="btn-primary">Back to Conditions</Link></div>;
  const meds = relatedMedications(condition);
  const appts = relatedAppointments(condition);
  const saveNotes = () => { const all = readStorage(KEYS.conditionNotes, {}); writeStorage(KEYS.conditionNotes, { ...all, [id]: notes }); alert('Condition notes saved'); };

  return <div className="max-w-4xl mx-auto space-y-5"><Link to="/conditions" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-teal-600 font-medium"><ArrowLeft size={16}/> Back to Conditions</Link>
    <div className="card"><div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2 mb-2"><span className="badge badge-teal capitalize">{condition.status}</span>{condition.diagnosedDate && <span className="badge badge-gray">Diagnosed {new Date(condition.diagnosedDate).toLocaleDateString('en-GB')}</span>}</div><h1 className="font-display font-bold text-2xl text-slate-800 flex items-center gap-2"><Activity className="text-green-600"/> {condition.name}</h1></div><ReadAloudButton text={condition.summary} languageCode="en-GB" compact /></div></div>
    <SafetyBanner compact />
    <div className="grid lg:grid-cols-2 gap-4"><div className="card border-teal-200 bg-teal-50/30"><h2 className="font-semibold text-slate-800 mb-2">Simple explanation</h2><ReadableText text={condition.summary} languageCode="en-GB" label="Read English section" compact /></div><div className="card"><h2 className="font-semibold text-slate-800 mb-2 flex items-center gap-2"><Languages size={16}/> Translation</h2><div className="bg-purple-50 rounded-lg p-3"><ReadableText text={(language === 'urdu' && condition.translatedSummary) ? condition.translatedSummary : conditionTranslationTemplates[language]?.(condition.name)} languageCode={languageCodes[language]} label="Read translation section" compact /></div></div></div>
    <div className="grid lg:grid-cols-2 gap-4"><div className="card"><h2 className="font-semibold mb-3 flex items-center gap-2"><Pill size={16} className="text-purple-600"/> Related medications</h2>{meds.length ? meds.map(m => <Link key={m.id} to={`/medications/${m.id}`} className="block bg-slate-50 rounded-lg p-3 mb-2 text-sm hover:bg-teal-50"><b>{m.name}</b> — {m.dose}, {m.frequency}</Link>) : <p className="text-sm text-slate-500">No related medications saved.</p>}</div><div className="card"><h2 className="font-semibold mb-3 flex items-center gap-2"><Calendar size={16} className="text-blue-600"/> Related appointments</h2>{appts.length ? appts.map(a => <Link key={a.id} to={`/appointments/${a.id}`} className="block bg-slate-50 rounded-lg p-3 mb-2 text-sm hover:bg-teal-50"><b>{a.title}</b><br/><span className="text-slate-500">{a.date} at {a.time}</span></Link>) : <p className="text-sm text-slate-500">No related appointments saved.</p>}</div></div>
    <div className="card"><h2 className="font-semibold mb-3 flex items-center gap-2"><HelpCircle size={16} className="text-purple-600"/> Questions to ask</h2><div className="mb-3"><ReadAloudButton text={condition.questions?.join('. ')} languageCode="en-GB" label="Read questions" compact /></div><div className="space-y-2">{condition.questions?.map(q => <p key={q} className="text-sm bg-purple-50 rounded-lg p-3">{q}</p>)}</div></div>
    <div className="card"><h2 className="font-semibold mb-3 flex items-center gap-2"><FileText size={16}/> Condition notes</h2><textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={5} placeholder="Add notes about symptoms, doctor advice, follow-up actions, or family questions..." className="w-full text-sm border border-slate-200 rounded-lg p-3 outline-none focus:border-teal-400"/><button onClick={saveNotes} className="btn-primary mt-3">Save Notes</button></div>
    <div><h2 className="font-semibold text-slate-800 text-sm mb-3 flex items-center gap-2"><MessageSquare size={16} className="text-teal-600"/> Ask AI about this condition</h2><ChatBox contextTitle={`your ${condition.name} condition`} /></div>
  </div>;
}
