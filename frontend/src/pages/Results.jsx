import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import {
  CheckCircle, Calendar, Pill, HelpCircle, BookOpen,
  MessageSquare, Bookmark, Languages, Send, Bot, User,
} from 'lucide-react';
import SafetyBanner from '../components/SafetyBanner';
import ReadAloudButton from '../components/ReadAloudButton';
import ReadableText from '../components/ReadableText';
import { languages, languageCodes } from '../data/mockData';
import { getSettings, addNotification } from '../utils/storage';
import { supabase } from '../lib/supabase';
import { saveAppointmentToSupabase, saveMedicationToSupabase } from '../lib/supabaseSync';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';



// ── Parse GPT summary string into structured sections ─────────────────────────
function parseSummary(text = '') {
  const out = { summary: '', keyActions: [], questions: [], glossary: [] };
  if (!text) return out;

  // Fix: (?:^|\n) handles section 1 at start of string (no preceding newline)
  const parts = text.split(/(?:^|\n)(?=\d+\.\s+\*\*)/);

  parts.forEach(part => {
    const trimmed = part.trim();
    if (!trimmed) return;
    const headerMatch = trimmed.match(/^(\d+)\.\s+\*\*([^*]+)\*\*/);
    if (!headerMatch) return;
    const afterHeader = trimmed.slice(headerMatch[0].length).replace(/^\s*[—–:-]\s*/, '').trim();
    const num = parseInt(headerMatch[1], 10);

    if (num === 1) {
      out.summary = afterHeader;
    } else if (num === 2) {
      out.keyActions = afterHeader
        .split('\n')
        .filter(l => /^[-•*]/.test(l.trim()))
        .map(l => l.replace(/^[-•*]\s*/, '').trim())
        .filter(Boolean);
    } else if (num === 4) {
      out.questions = afterHeader
        .split('\n')
        .filter(l => /^[-•*\d]/.test(l.trim()))
        .map(l => l.replace(/^[-•*\d.)\s]+/, '').trim())
        .filter(Boolean);
    } else if (num === 5) {
      out.glossary = afterHeader
        .split('\n')
        .map(l => {
          const m = l.match(/\*\*([^*]+)\*\*[:\s—–-]+(.+)/);
          return m ? { term: m[1].trim(), explanation: m[2].trim() } : null;
        })
        .filter(Boolean);
    }
  });

  if (!out.summary && !out.keyActions.length) out.summary = text;
  return out;
}

// ── Appointment card builder ──────────────────────────────────────────────────
function buildAppointment(structured) {
  if (!structured) return null;
  const { date, time, hospital_or_clinic, department, doctor_name, location_address } = structured;
  if (!date && !hospital_or_clinic) return null;
  return {
    title:    department || hospital_or_clinic || 'Appointment',
    date:     date     || 'Date not stated',
    time:     time     || 'Time not stated',
    location: hospital_or_clinic || location_address || 'Location not stated',
    type:     doctor_name ? `Dr. ${doctor_name}` : 'Medical Appointment',
  };
}

// ── Medication card builder ───────────────────────────────────────────────────
function buildMedication(structured) {
  if (!structured) return null;
  const med = structured.medications?.[0];
  if (!med) return null;
  return {
    name:      med.name || 'Unknown medication',
    dose:      med.dosage || '',
    frequency: med.frequency || med.instructions || '',
  };
}



// ── Shared section wrapper ────────────────────────────────────────────────────
function Section({ icon: Icon, title, color = 'text-teal-600', children }) {
  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-4">
        <Icon size={18} className={color} />
        <h2 className="font-display font-semibold text-slate-800">{title}</h2>
      </div>
      {children}
    </div>
  );
}

// ── Per-document AI Chat ──────────────────────────────────────────────────────
function DocumentChat({ documentId, documentSummary }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hi! I've read your document and I'm ready to answer questions about it. What would you like to know?" },
  ]);
  const [input,   setInput]   = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef             = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const userMsg = { role: 'user', content: text };
    const next    = [...messages, userMsg];
    setMessages(next);
    setInput('');
    setLoading(true);
    try {
      // Get Supabase user session for user_id
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id || 'anonymous';

      const res = await fetch(`${API_BASE}/chat`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          document_id:      documentId,
          user_id:          userId,          // ← the missing field
          message:          text,
          document_summary: documentSummary, // ← grounds the chat in THIS doc
        }),
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I could not reach the server. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare size={18} className="text-teal-600" />
        <h2 className="font-display font-semibold text-slate-800">Ask About This Document</h2>
      </div>
      <p className="text-xs text-slate-500 mb-3">
        Ask questions based on what's in your letter. CareBridge will only answer from the document — it won't guess.
      </p>
      <div className="bg-slate-50 rounded-xl p-3 space-y-3 max-h-80 overflow-y-auto mb-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex items-start gap-2 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${m.role === 'assistant' ? 'bg-teal-100 text-teal-700' : 'bg-slate-200 text-slate-600'}`}>
              {m.role === 'assistant' ? <Bot size={14} /> : <User size={14} />}
            </div>
            <div className={`max-w-[80%] rounded-xl px-3 py-2 text-sm leading-relaxed ${m.role === 'assistant' ? 'bg-white border border-slate-200 text-slate-700' : 'bg-teal-600 text-white'}`}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-teal-100 flex items-center justify-center"><Bot size={14} className="text-teal-700" /></div>
            <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 flex gap-1">
              <span className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="e.g. What do I need to bring?"
          className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-50"
          disabled={loading}
        />
        <button onClick={send} disabled={loading || !input.trim()} className="btn-primary px-3 py-2 disabled:opacity-50" aria-label="Send">
          <Send size={15} />
        </button>
      </div>
    </div>
  );
}

// ── Main Results page ─────────────────────────────────────────────────────────
export default function Results() {
  const location   = useLocation();
  const result     = location.state?.result;
  const documentId = location.state?.documentId;

  const [apptSaved,  setApptSaved]  = useState(false);
  const [medSaved,   setMedSaved]   = useState(false);
  const [apptSaving, setApptSaving] = useState(false);
  const [medSaving,  setMedSaving]  = useState(false);
  const [language,   setLanguage]   = useState(getSettings().preferredLanguage || 'urdu');
  const [translated, setTranslated] = useState('');
  const [translating,setTranslating]= useState(false);

  const parsed        = parseSummary(result?.summary_english || result?.summary || '');
  const appointment   = buildAppointment(result?.structured_data);
  const medication    = buildMedication(result?.structured_data);
  const docType       = result?.doc_type || 'document';
  const languageLabel = languages.find(l => l.value === language)?.label || 'Selected language';

  useEffect(() => {
    if (!result?.summary_english) return;
    const langCode = languageCodes?.[language];
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!langCode || langCode === 'en-GB' || langCode === 'en-US') { setTranslated(''); return; }
    const map = { urdu:'ur-PK', brazilian_portuguese:'pt-BR', french:'fr-FR', japanese:'ja-JP', hindi:'hi-IN', arabic:'ar-SA', spanish:'es-ES', polish:'pl-PL' };
    setTranslating(true);
    fetch(`${API_BASE}/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: result.summary_english, language: map[language] || language }),
    })
      .then(r => r.json()).then(d => setTranslated(d.translated || ''))
      .catch(() => setTranslated('Translation failed. Please try again.'))
      .finally(() => setTranslating(false));
  }, [language, result?.summary_english]);

  const handleSaveAppointment = async () => {
    setApptSaving(true);
    try {
      await saveAppointmentToSupabase(result.structured_data, documentId);
      setApptSaved(true);

      console.log(result.structured_data);


      addNotification('Appointment saved to your list', 'appointment');
    } catch (err) {
       console.error(err);
      addNotification(`Could not save appointment: ${err.message}`, 'error');
    } finally {
      setApptSaving(false);
    }
  };

  const handleSaveMedication = async () => {
    setMedSaving(true);
    try {
      await saveMedicationToSupabase(result.structured_data, documentId);
      setMedSaved(true);
      addNotification('Medication saved to your list', 'medication');
    } catch (err) {
       console.error(err);
      addNotification(`Could not save medication: ${err.message}`, 'error');
    } finally {
      setMedSaving(false);
    }
  };

  if (!result) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="card text-center py-12">
          <p className="text-slate-500 mb-3">No results to display.</p>
          <a href="/upload" className="btn-primary inline-block">Upload a document</a>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="badge badge-teal">AI Analysis Complete</span>
            <span className="badge badge-gray">{docType.replace('_', ' ')}</span>
          </div>
          <h1 className="font-display font-bold text-2xl text-slate-800">Your Results</h1>
          <p className="text-sm text-slate-500 mt-0.5">Based on your uploaded document</p>
        </div>
        <ReadAloudButton text={[parsed.summary, ...parsed.keyActions].join('. ')} languageCode="en-GB" />
      </div>

      <SafetyBanner compact />

      {/* Language selector */}
      <div className="card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Languages size={18} className="text-teal-600" />
          <div>
            <p className="font-semibold text-sm text-slate-800">Translate explanation</p>
            <p className="text-xs text-slate-500">Default language comes from Settings.</p>
          </div>
        </div>
        <select
          value={language}
          onChange={e => setLanguage(e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-teal-400 bg-white text-slate-700"
        >
          {languages
            .filter(l => ['urdu','brazilian_portuguese','french','japanese','hindi','arabic','spanish','polish'].includes(l.value))
            .map(l => <option key={l.value} value={l.value}>{l.label}</option>)
          }
        </select>
      </div>

      {/* English summary */}
      <Section icon={BookOpen} title="Simple English Summary">
        <ReadableText text={parsed.summary || result.summary} languageCode="en-GB" label="Read English section" compact />
      </Section>

      {/* Translation */}
      <Section icon={Languages} title={`${languageLabel} Translation`} color="text-teal-600">
        <div className="bg-teal-50 border border-teal-100 rounded-lg p-3">
          {translating
            ? <p className="text-sm text-teal-600 animate-pulse">Translating…</p>
            : <ReadableText
                text={translated || 'Select a language above to see the translation.'}
                languageCode={languageCodes?.[language] || 'en-GB'}
                label={`Read ${languageLabel} section`}
                compact
                textClassName="text-sm text-teal-800 leading-relaxed"
              />
          }
        </div>
      </Section>

      {/* Key actions */}
      {parsed.keyActions.length > 0 && (
        <Section icon={CheckCircle} title="What You Should Do" color="text-green-600">
          <div className="mb-3">
            <ReadAloudButton text={parsed.keyActions.join('. ')} languageCode="en-GB" label="Read actions" compact />
          </div>
          <ul className="space-y-2">
            {parsed.keyActions.map((action, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-slate-700">
                <CheckCircle size={16} className="text-green-500 shrink-0 mt-0.5" />
                {action}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Glossary */}
      {parsed.glossary.length > 0 && (
        <Section icon={BookOpen} title="Medical Terms Explained" color="text-blue-600">
          <div className="mb-3">
            <ReadAloudButton text={parsed.glossary.map(t => `${t.term}: ${t.explanation}`).join('. ')} languageCode="en-GB" label="Read terms" compact />
          </div>
          <div className="space-y-3">
            {parsed.glossary.map((term, i) => (
              <div key={i} className="bg-slate-50 rounded-lg p-3">
                <p className="font-semibold text-sm text-slate-800 mb-0.5">{term.term}</p>
                <p className="text-sm text-slate-600 leading-relaxed">{term.explanation}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Questions */}
      {parsed.questions.length > 0 && (
        <Section icon={HelpCircle} title="Questions to Ask Your Doctor" color="text-purple-600">
          <div className="mb-3">
            <ReadAloudButton text={parsed.questions.join('. ')} languageCode="en-GB" label="Read questions" compact />
          </div>
          <ul className="space-y-2">
            {parsed.questions.map((q, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-slate-700 bg-purple-50 rounded-lg px-3 py-2">
                <MessageSquare size={14} className="text-purple-400 shrink-0 mt-0.5" />
                {q}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Appointment + Medication save cards */}
      {(appointment || medication) && (
        <div className="grid md:grid-cols-2 gap-4">
          {appointment && (
            <div className="card border-blue-200 bg-blue-50/50">
              <div className="flex items-center gap-2 mb-3">
                <Calendar size={18} className="text-blue-600" />
                <h2 className="font-display font-semibold text-slate-800">Appointment Found</h2>
              </div>
              <div className="bg-white border border-blue-100 rounded-lg p-4 space-y-1.5 mb-4">
                <p className="font-semibold text-slate-800">{appointment.title}</p>
                <p className="text-sm text-slate-600">{appointment.date} at {appointment.time}</p>
                <p className="text-sm text-slate-600">{appointment.location}</p>
                <span className="badge badge-blue text-xs">{appointment.type}</span>
              </div>
              <button
                onClick={handleSaveAppointment}
                disabled={apptSaved || apptSaving}
                className="btn-secondary text-sm flex items-center gap-2 disabled:opacity-60"
              >
                {apptSaving
                  ? <><div className="w-3 h-3 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />Saving…</>
                  : <><Bookmark size={14} className={apptSaved ? 'fill-current' : ''} />{apptSaved ? 'Appointment Saved ✓' : 'Save Appointment'}</>
                }
              </button>
            </div>
          )}

          {medication && (
            <div className="card border-purple-200 bg-purple-50/50">
              <div className="flex items-center gap-2 mb-3">
                <Pill size={18} className="text-purple-600" />
                <h2 className="font-display font-semibold text-slate-800">Medication Found</h2>
              </div>
              <div className="bg-white border border-purple-100 rounded-lg p-4 space-y-1.5 mb-4">
                <p className="font-semibold text-slate-800">{medication.name} {medication.dose}</p>
                <p className="text-sm text-slate-600">{medication.frequency}</p>
                <span className="badge badge-yellow text-xs">From document</span>
              </div>
              <button
                onClick={handleSaveMedication}
                disabled={medSaved || medSaving}
                className="btn-secondary text-sm flex items-center gap-2 disabled:opacity-60"
              >
                {medSaving
                  ? <><div className="w-3 h-3 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />Saving…</>
                  : <><Bookmark size={14} className={medSaved ? 'fill-current' : ''} />{medSaved ? 'Medication Saved ✓' : 'Save Medication'}</>
                }
              </button>
            </div>
          )}
        </div>
      )}

      {/* Per-document AI chat */}
        {documentId && (
          <DocumentChat
            documentId={documentId}
            documentSummary={result?.summary_english || result?.summary || ''}
          />
        )}
      <SafetyBanner />
    </div>
  );
}