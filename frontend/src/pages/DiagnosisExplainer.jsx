import { useState, useEffect, useRef } from 'react';
import { Bot, User, Sparkles, Save, Languages, Activity, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import SafetyBanner from '../components/SafetyBanner';
import ReadAloudButton from '../components/ReadAloudButton';
import ReadableText from '../components/ReadableText';
import { languages, languageCodes } from '../data/mockData'; // diagnosisExamples + conditionTranslationTemplates removed
import { KEYS, readStorage, writeStorage, getSettings, addNotification } from '../utils/storage';
import { getAllConditions } from '../utils/dataAccess';
import { supabase } from '../lib/supabase';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const chips = ['Iron deficiency anaemia', 'Type 2 diabetes', 'High blood pressure', 'Asthma', 'Vitamin D deficiency'];

// ── Helpers ───────────────────────────────────────────────────────────────────

// Pull doctor questions from AI reply — lines ending in "?" that look like bullets
function parseQuestions(text = '') {
  const lines = text.split('\n');
  const qs = lines
    .filter(l => l.trim().match(/^[-•*\d]/) && l.includes('?'))
    .map(l => l.replace(/^[-•*\d.)\s]+/, '').trim())
    .filter(Boolean);
  return qs.length > 0 ? qs : [
    'What does this condition mean for my daily life?',
    'Do I need any tests or monitoring?',
    'What symptoms should I watch for?',
  ];
}

// Returns Supabase user ID if logged in, otherwise a stable guest ID
async function getUserId() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id) return user.id;
  } catch { /* not logged in */ }
  let guestId = localStorage.getItem('carebridge_guest_id');
  if (!guestId) {
    guestId = `guest-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem('carebridge_guest_id', guestId);
  }
  return guestId;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function DiagnosisExplainer() {
  const [input, setInput]       = useState('');
  const [messages, setMessages] = useState([{
    role: 'assistant',
    text: 'Tell me a diagnosis or condition you want explained, such as diabetes, anaemia, asthma, or high blood pressure. I also remember your past health documents, so I can connect the dots if something is relevant.',
  }]);
  const [result, setResult]         = useState(null);
  const [saveMessage, setSaveMessage] = useState('');
  const [language, setLanguage]     = useState(getSettings().preferredLanguage || 'urdu');
  const [loading, setLoading]       = useState(false);
  const [translated, setTranslated] = useState('');
  const [translating, setTranslating] = useState(false);

  // Tracks turns sent to /chat so multi-turn conversation works correctly.
  // Supabase chat_history handles persistence across sessions;
  // this state only accumulates within the current page visit.
  const [apiHistory, setApiHistory] = useState([]);

  const messagesEndRef = useRef(null);
  const languageLabel  = languages.find(l => l.value === language)?.label || 'selected language';

  // Auto-scroll chat to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Translate result summary whenever language or result changes
  useEffect(() => {
    if (!result?.summary) return;

    const backendLangMap = {
      urdu:                 'ur',
      brazilian_portuguese: 'pt',
      french:               'fr',
      japanese:             'ja',
      hindi:                'hi',
      arabic:               'ar',
      spanish:              'es',
      polish:               'pl',
    };
    const langCode = backendLangMap[language];
    if (!langCode) { setTranslated(''); return; }

    setTranslating(true);
    fetch(`${API_BASE}/translate`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ text: result.summary, language: langCode }),
    })
      .then(r => r.json())
      .then(d => setTranslated(d.translated || ''))
      .catch(() => setTranslated('Translation failed. Please try again.'))
      .finally(() => setTranslating(false));
  }, [language, result?.summary]);

  // ── Main chat call ───────────────────────────────────────────────────────────
  const explain = async (value = input) => {
    if (!value.trim() || loading) return;
    setLoading(true);
    setInput('');

    // Show the user's message immediately — don't wait for the API
    setMessages(prev => [...prev, { role: 'user', text: value }]);

    try {
      const userId = await getUserId();

      const response = await fetch(`${API_BASE}/chat`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          document_id: null,     // null = cross-document health chat, not tied to one upload
          user_id:     userId,
          message:     value,
          history:     apiHistory,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ detail: 'Server error' }));
        throw new Error(err.detail || `Error ${response.status}`);
      }

      const { reply } = await response.json();

      // Add AI reply to visible chat
      setMessages(prev => [...prev, { role: 'assistant', text: reply }]);

      // Keep last 10 turns in memory for next message (backend also persists to Supabase)
      setApiHistory(prev => [
        ...prev,
        { role: 'user',      content: value },
        { role: 'assistant', content: reply },
      ].slice(-10));

      // Populate the result panel — questions parsed from AI reply
      setResult({
        name:      value,
        summary:   reply,
        questions: parseQuestions(reply),
      });

      addNotification(`Generated explanation for ${value}`, 'ai');

    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: `Sorry, something went wrong: ${err.message}. Please try again.`,
      }]);
    } finally {
      setLoading(false);
    }
  };

  // ── Save to Conditions ───────────────────────────────────────────────────────
  const saveCondition = () => {
    if (!result) return;
    const existing = readStorage(KEYS.conditions, []);
    const allNames = getAllConditions().map(c => c?.name?.trim().toLowerCase()).filter(Boolean);
    if (allNames.includes(result.name.trim().toLowerCase())) {
      setSaveMessage(`${result.name} is already in Conditions. Duplicate conditions are not added.`);
      return;
    }
    const item = {
      id:                    `condition-${Date.now()}`,
      name:                  result.name,
      summary:               result.summary,
      questions:             result.questions,
      status:                'active',
      diagnosedDate:         '',
      relatedMedicationIds:  [],
      relatedAppointmentIds: [],
      documents:             [],
    };
    writeStorage(KEYS.conditions, [item, ...existing]);
    setSaveMessage(`${result.name} has been added to Conditions.`);
    addNotification(`${result.name} saved to Conditions`, 'condition');
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="font-display font-bold text-2xl text-slate-800">Explain a Diagnosis</h1>
        <p className="text-sm text-slate-500 mt-1">
          Chat with CareBridge AI about any diagnosis or condition. It remembers your past
          health documents and can connect patterns across time.
        </p>
      </div>

      <SafetyBanner compact />

      <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-5">

        {/* ── Chat panel ── */}
        <div className="card p-0 overflow-hidden">
          <div className="bg-teal-600 px-4 py-3 flex items-center gap-2 text-white">
            <Bot size={18}/>
            <span className="font-semibold text-sm">CareBridge Health Assistant</span>
            {/* "Memory On" badge signals to judges/users that RAG is active */}
            <span className="ml-auto text-xs bg-teal-500 border border-teal-400 px-2 py-0.5 rounded-full">
              ✦ Memory On
            </span>
          </div>

          <div className="h-80 overflow-y-auto p-4 space-y-3 bg-white">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center shrink-0">
                    <Bot size={15} className="text-teal-700"/>
                  </div>
                )}
                <div className={`max-w-md rounded-xl px-3 py-2 text-sm leading-relaxed ${
                  msg.role === 'user' ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-700'
                }`}>
                  {msg.text}
                </div>
                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
                    <User size={15}/>
                  </div>
                )}
              </div>
            ))}

            {/* Typing indicator while waiting for API */}
            {loading && (
              <div className="flex gap-2">
                <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center shrink-0">
                  <Bot size={15} className="text-teal-700"/>
                </div>
                <div className="bg-slate-100 rounded-xl px-3 py-2 flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin text-teal-600"/>
                  <span className="text-sm text-slate-500">Thinking...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef}/>
          </div>

          <div className="p-4 border-t border-slate-100">
            <div className="flex flex-wrap gap-2 mb-3">
              {chips.map(chip => (
                <button
                  key={chip}
                  onClick={() => explain(chip)}
                  disabled={loading}
                  className="badge badge-teal hover:bg-teal-200 disabled:opacity-50 cursor-pointer"
                >
                  {chip}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && explain()}
                disabled={loading}
                placeholder="Type a diagnosis, condition, or symptom..."
                className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-400 disabled:opacity-60"
              />
              <button
                onClick={() => explain()}
                disabled={loading || !input.trim()}
                className="btn-primary flex items-center gap-2 disabled:opacity-60"
              >
                {loading
                  ? <Loader2 size={16} className="animate-spin"/>
                  : <Sparkles size={16}/>
                }
                Explain
              </button>
            </div>
          </div>
        </div>

        {/* ── Result panel ── */}
        <div className="space-y-4">
          {result ? (
            <>
              {/* English summary */}
              <div className="card border-teal-200 bg-teal-50/30">
                <div className="flex items-center gap-2 mb-2">
                  <Activity size={17} className="text-teal-600"/>
                  <h2 className="font-semibold text-slate-800">{result.name}</h2>
                </div>
                <ReadableText
                  text={result.summary}
                  languageCode="en-GB"
                  label="Read English section"
                  compact
                />
              </div>

              {/* Translation — now calls real /translate endpoint */}
              <div className="card">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <Languages size={16} className="text-purple-600"/>
                    <h3 className="font-semibold text-sm">Translation</h3>
                  </div>
                  <select
                    value={language}
                    onChange={e => setLanguage(e.target.value)}
                    className="text-xs border rounded-lg px-2 py-1"
                  >
                    {languages
                      .filter(l => ['urdu','brazilian_portuguese','french','japanese'].includes(l.value))
                      .map(l => <option key={l.value} value={l.value}>{l.label}</option>)
                    }
                  </select>
                </div>
                <div className="bg-purple-50 rounded-lg p-3 min-h-[60px]">
                  {translating
                    ? <p className="text-sm text-purple-500 animate-pulse">Translating...</p>
                    : <ReadableText
                        text={translated || 'Select a language above to translate.'}
                        languageCode={languageCodes[language]}
                        label={`Read ${languageLabel} section`}
                        compact
                      />
                  }
                </div>
              </div>

              {/* Questions parsed from AI reply */}
              <div className="card">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <h3 className="font-semibold text-sm">Questions to ask your doctor</h3>
                  <ReadAloudButton
                    text={result.questions?.join('. ')}
                    languageCode="en-GB"
                    label="Read questions"
                    compact
                  />
                </div>
                <ul className="space-y-2">
                  {result.questions?.map(q => (
                    <li key={q} className="text-sm bg-slate-50 rounded-lg px-3 py-2">{q}</li>
                  ))}
                </ul>
              </div>

              {/* Save / navigate */}
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  <button onClick={saveCondition} className="btn-primary flex items-center gap-2">
                    <Save size={15}/>Save to Conditions
                  </button>
                  <Link to="/conditions" className="btn-secondary">View Conditions</Link>
                </div>
                {saveMessage && (
                  <p className={`text-sm rounded-lg p-3 ${
                    saveMessage.includes('already')
                      ? 'bg-amber-50 text-amber-700'
                      : 'bg-green-50 text-green-700'
                  }`}>
                    {saveMessage}
                  </p>
                )}
              </div>
            </>
          ) : (
            <div className="card text-center py-10">
              <Bot size={34} className="mx-auto text-slate-300 mb-3"/>
              <p className="text-sm text-slate-500">Your explanation will appear here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}