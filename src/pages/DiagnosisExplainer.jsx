import { useState } from 'react';
import { Bot, User, Sparkles, Save, Languages, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';
import SafetyBanner from '../components/SafetyBanner';
import ReadAloudButton from '../components/ReadAloudButton';
import ReadableText from '../components/ReadableText';
import { diagnosisExamples, languages, languageCodes, conditionTranslationTemplates } from '../data/mockData';
import { KEYS, readStorage, writeStorage, getSettings, addNotification } from '../utils/storage';
import { getAllConditions } from '../utils/dataAccess';

const chips = ['Iron deficiency anaemia', 'Type 2 diabetes', 'High blood pressure', 'Asthma', 'Vitamin D deficiency'];

function findDiagnosis(input) {
  const key = input.toLowerCase().trim();
  return diagnosisExamples[key] || Object.entries(diagnosisExamples).find(([k]) => key.includes(k))?.[1] || {
    id: Date.now(), name: input || 'Example condition', status: 'active', diagnosedDate: '',
    summary: `${input || 'This condition'} is a health condition that should be explained by a healthcare professional. CareBridge can help turn existing medical information into simpler language and prepare questions for your doctor.`,
    translatedSummary: `${input || 'Is condition'} ke baare mein doctor se tafseel poochni chahiye. CareBridge aap ko simple language mein samjhane aur sawalat tayyar karne mein madad karta hai.`,
    questions: ['What does this condition mean for daily life?', 'Do I need any tests?', 'What symptoms should I watch for?', 'What treatment options should I discuss?'],
    relatedMedicationIds: [], relatedAppointmentIds: [], documents: []
  };
}

export default function DiagnosisExplainer() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([{ role: 'assistant', text: 'Tell me a diagnosis or condition you want explained, such as diabetes, anaemia, asthma, or high blood pressure.' }]);
  const [result, setResult] = useState(null);
  const [saveMessage, setSaveMessage] = useState('');
  const [language, setLanguage] = useState(getSettings().preferredLanguage || 'urdu');
  const languageLabel = languages.find(l => l.value === language)?.label || 'selected language';

  const explain = (value = input) => {
    if (!value.trim()) return;
    const diag = findDiagnosis(value);
    setResult(diag);
    setMessages(prev => [...prev, { role: 'user', text: value }, { role: 'assistant', text: diag.summary }]);
    setInput('');
    addNotification(`Generated explanation for ${diag.name}`, 'ai');
  };

  const saveCondition = () => {
    if (!result) return;
    const existing = readStorage(KEYS.conditions, []);
    const allNames = getAllConditions().map(c => c?.name?.trim().toLowerCase()).filter(Boolean);
    if (allNames.includes(result.name.trim().toLowerCase())) {
      setSaveMessage(`${result.name} is already in Conditions. Duplicate conditions are not added.`);
      return;
    }
    const item = { ...result, id: `condition-${Date.now()}` };
    writeStorage(KEYS.conditions, [item, ...existing]);
    setSaveMessage(`${result.name} has been added to Conditions.`);
    addNotification(`${result.name} saved to Conditions`, 'condition');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div><h1 className="font-display font-bold text-2xl text-slate-800">Explain a Diagnosis</h1><p className="text-sm text-slate-500 mt-1">A chat-style explainer for existing diagnoses or conditions. No document upload needed.</p></div>
      <SafetyBanner compact />
      <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-5">
        <div className="card p-0 overflow-hidden">
          <div className="bg-teal-600 px-4 py-3 flex items-center gap-2 text-white"><Bot size={18}/><span className="font-semibold text-sm">CareBridge Diagnosis Assistant</span></div>
          <div className="h-80 overflow-y-auto p-4 space-y-3 bg-white">
            {messages.map((msg, i) => <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : ''}`}>{msg.role === 'assistant' && <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center"><Bot size={15} className="text-teal-700"/></div>}<div className={`max-w-md rounded-xl px-3 py-2 text-sm ${msg.role === 'user' ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-700'}`}>{msg.text}</div>{msg.role === 'user' && <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center"><User size={15}/></div>}</div>)}
          </div>
          <div className="p-4 border-t border-slate-100">
            <div className="flex flex-wrap gap-2 mb-3">{chips.map(chip => <button key={chip} onClick={() => explain(chip)} className="badge badge-teal hover:bg-teal-200">{chip}</button>)}</div>
            <div className="flex gap-2"><input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && explain()} placeholder="Type a diagnosis or condition..." className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-400"/><button onClick={() => explain()} className="btn-primary flex items-center gap-2"><Sparkles size={16}/>Explain</button></div>
          </div>
        </div>
        <div className="space-y-4">
          {result ? <>
            <div className="card border-teal-200 bg-teal-50/30"><div className="flex items-center gap-2 mb-2"><Activity size={17} className="text-teal-600"/><h2 className="font-semibold text-slate-800">{result.name}</h2></div><ReadableText text={result.summary} languageCode="en-GB" label="Read English section" compact /></div>
            <div className="card"><div className="flex items-center justify-between gap-3 mb-3"><div className="flex items-center gap-2"><Languages size={16} className="text-purple-600"/><h3 className="font-semibold text-sm">Translation</h3></div><select value={language} onChange={e=>setLanguage(e.target.value)} className="text-xs border rounded-lg px-2 py-1">{languages.filter(l => ['urdu','brazilian_portuguese','french','japanese'].includes(l.value)).map(l => <option key={l.value} value={l.value}>{l.label}</option>)}</select></div><div className="bg-purple-50 rounded-lg p-3"><ReadableText text={(language === 'urdu' && result.translatedSummary) ? result.translatedSummary : (conditionTranslationTemplates[language]?.(result.name) || result.translatedSummary)} languageCode={languageCodes[language]} label={`Read ${languageLabel} section`} compact /></div></div>
            <div className="card"><div className="flex items-center justify-between gap-3 mb-2"><h3 className="font-semibold text-sm">Questions to ask your doctor</h3><ReadAloudButton text={result.questions?.join('. ')} languageCode="en-GB" label="Read questions" compact /></div><ul className="space-y-2">{result.questions?.map(q => <li key={q} className="text-sm bg-slate-50 rounded-lg px-3 py-2">{q}</li>)}</ul></div>
            <div className="space-y-2"><div className="flex flex-wrap gap-2"><button onClick={saveCondition} className="btn-primary flex items-center gap-2"><Save size={15}/>Save to Conditions</button><Link to="/conditions" className="btn-secondary">View Conditions</Link></div>{saveMessage && <p className={`text-sm rounded-lg p-3 ${saveMessage.includes('already') ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'}`}>{saveMessage}</p>}</div>
          </> : <div className="card text-center py-10"><Bot size={34} className="mx-auto text-slate-300 mb-3"/><p className="text-sm text-slate-500">Your explanation will appear here.</p></div>}
        </div>
      </div>
    </div>
  );
}
