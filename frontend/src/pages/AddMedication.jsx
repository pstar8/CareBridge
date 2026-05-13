import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Upload, Pencil, Sparkles, Save, ArrowLeft } from 'lucide-react';
import UploadBox from '../components/UploadBox';
import SafetyBanner from '../components/SafetyBanner';
import { KEYS, readStorage, writeStorage, addNotification } from '../utils/storage';
import { findMedication } from '../utils/dataAccess';
import { saveManualMedicationToSupabase } from '../lib/supabaseSync';  // ← NEW

const blank = {
  name: '', dose: '', frequency: '', timing: '', status: 'current',
  reason: '', startDate: '', endDate: '', prescriber: '', notes: '',
  type: 'Tablet', explanation: '', explanationUrdu: '',
};

const extracted = {
  name: 'Ferrous Sulfate', dose: '200mg', frequency: 'Once daily',
  timing: 'With food or shortly after meals', status: 'current',
  reason: 'Low iron / iron deficiency anaemia',
  startDate: new Date().toISOString().slice(0, 10), endDate: '',
  prescriber: 'GP / hospital doctor',
  notes: 'Mock AI extraction from uploaded medication note. Please review with a doctor or pharmacist.',
  type: 'Tablet',
  explanation: 'Ferrous sulfate is an iron tablet commonly used when iron levels are low. It helps the body make healthy red blood cells.',
  explanationUrdu: 'Ferrous sulfate iron ki goli hai jo iron kam hone par di jaati hai. Yeh sehatmand khoon banane mein madad karti hai.',
  questions: ['Should I take this with food?', 'What should I do if I miss a dose?', 'How long should I take it?', 'Are there side effects?'],
  sideEffects: ['Constipation', 'Dark stools', 'Nausea'],
};

export default function AddMedication({ editMode = false }) {
  const navigate = useNavigate();
  const { id }   = useParams();

  const existingMed      = useMemo(() => editMode ? findMedication(id) : null, [editMode, id]);
  const [mode,           setMode]           = useState('manual');
  const [text,           setText]           = useState('');
  const [form,           setForm]           = useState(() => existingMed ? { ...blank, ...existingMed } : blank);
  const [extractedReady, setExtractedReady] = useState(false);
  const [saving,         setSaving]         = useState(false);

  const update  = (field, value) => setForm(prev => ({ ...prev, [field]: value }));
  const extract = () => {
    setForm(prev => ({ ...prev, ...extracted, id: prev.id }));
    setExtractedReady(true);
    addNotification('Medication details extracted from document', 'medication');
  };

  // ── Save: writes to localStorage (existing) + Supabase (new) ──────────────
  const save = async () => {
    setSaving(true);
    try {
      const meds = readStorage(KEYS.medications, []);
      const item = {
        ...form,
        id:          editMode ? form.id : `med-${Date.now()}`,
        questions:   form.questions   || extracted.questions,
        sideEffects: form.sideEffects || [],
        nhsSource:   form.nhsSource   || 'NHS Medicines A to Z placeholder',
        nhsUrl:      form.nhsUrl      || '',
      };

      // 1. Save to localStorage — existing behaviour, keeps local display instant
      const next = [item, ...meds.filter(m => String(m.id) !== String(item.id))];
      writeStorage(KEYS.medications, next);

      // 2. Also push to Supabase — fire and forget, so a slow network won't block navigation
      saveManualMedicationToSupabase(form).catch(err =>
        console.warn('Supabase save failed (local copy kept):', err.message)
      );

      addNotification(`${form.name || 'Medication'} ${editMode ? 'updated' : 'added'}`, 'medication');
      navigate(`/medications/${item.id}`);
    } finally {
      setSaving(false);
    }
  };

  if (editMode && !existingMed) {
    return (
      <div className="max-w-3xl mx-auto text-center py-16">
        <p className="text-slate-500 text-lg mb-4">Medication not found.</p>
        <button onClick={() => navigate('/medications')} className="btn-primary">Back to Medications</button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <button
        onClick={() => navigate(editMode ? `/medications/${id}` : '/medications')}
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-teal-600 font-medium"
      >
        <ArrowLeft size={16} /> Back
      </button>

      <div>
        <h1 className="font-display font-bold text-2xl text-slate-800">
          {editMode ? 'Edit Medication' : 'Add Medication'}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {editMode
            ? 'Update medication details and save changes.'
            : 'Add manually or use a mock AI extraction from an uploaded note/prescription.'}
        </p>
      </div>

      <SafetyBanner compact />

      {/* Mode picker */}
      {!editMode && (
        <div className="grid sm:grid-cols-2 gap-3">
          <button
            onClick={() => setMode('manual')}
            className={`card flex items-center gap-3 ${mode === 'manual' ? 'border-teal-300 bg-teal-50' : ''}`}
          >
            <Pencil size={20} className="text-teal-600" />
            <div className="text-left">
              <p className="font-semibold text-sm">Add manually</p>
              <p className="text-xs text-slate-500">Type medicine details yourself.</p>
            </div>
          </button>
          <button
            onClick={() => setMode('ai')}
            className={`card flex items-center gap-3 ${mode === 'ai' ? 'border-teal-300 bg-teal-50' : ''}`}
          >
            <Upload size={20} className="text-purple-600" />
            <div className="text-left">
              <p className="font-semibold text-sm">AI add from image/document</p>
              <p className="text-xs text-slate-500">Upload or paste a prescription note.</p>
            </div>
          </button>
        </div>
      )}

      {/* AI extraction panel */}
      {!editMode && mode === 'ai' && (
        <div className="card space-y-4">
          <UploadBox />
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            rows={4}
            placeholder="Or paste medication note text here..."
            className="w-full text-sm border border-slate-200 rounded-lg p-3 outline-none focus:border-teal-400"
          />
          <button onClick={extract} className="btn-secondary flex items-center gap-2">
            <Sparkles size={15} /> Extract Medication Details
          </button>
          {extractedReady && (
            <p className="text-sm text-green-700 bg-green-50 rounded-lg p-3">
              Mock AI extraction complete. Review and edit the details below before saving.
            </p>
          )}
        </div>
      )}

      {/* Form fields */}
      <div className="card">
        <h2 className="font-semibold text-slate-800 mb-4">Medication details</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {[
            ['name',       'Medication name'],
            ['dose',       'Dose'],
            ['frequency',  'Frequency'],
            ['timing',     'Timing'],
            ['reason',     'Reason'],
            ['prescriber', 'Prescriber'],
            ['startDate',  'Start date'],
            ['endDate',    'End date'],
          ].map(([field, label]) => (
            <label key={field} className="block">
              <span className="block text-xs font-medium text-slate-600 mb-1">{label}</span>
              <input
                type={field.toLowerCase().includes('date') ? 'date' : 'text'}
                value={form[field] || ''}
                onChange={e => update(field, e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-400"
              />
            </label>
          ))}
          <label>
            <span className="block text-xs font-medium text-slate-600 mb-1">Status</span>
            <select
              value={form.status}
              onChange={e => update('status', e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
            >
              <option value="current">Current</option>
              <option value="past">Past</option>
              <option value="paused">Paused</option>
              <option value="unsure">Unsure</option>
            </select>
          </label>
        </div>

        <label className="block mt-4">
          <span className="block text-xs font-medium text-slate-600 mb-1">Notes</span>
          <textarea
            value={form.notes || ''}
            onChange={e => update('notes', e.target.value)}
            rows={4}
            className="w-full border border-slate-200 rounded-lg p-3 text-sm outline-none focus:border-teal-400"
          />
        </label>

        <button
          disabled={!form.name.trim() || saving}
          onClick={save}
          className="btn-primary mt-4 flex items-center gap-2 disabled:opacity-50"
        >
          {saving
            ? <><div className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Saving…</>
            : <><Save size={15} /> {editMode ? 'Save Changes' : 'Save Medication'}</>
          }
        </button>
      </div>
    </div>
  );
}