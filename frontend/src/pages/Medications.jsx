import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Pill, Plus, Download } from 'lucide-react';
import MedicationCard from '../components/MedicationCard';
import { getAllMedications } from '../utils/dataAccess';          // mock data — untouched
import { fetchSupabaseMedications } from '../lib/supabaseSync';   // real Supabase data

export default function Medications() {
  const [search,           setSearch]           = useState('');
  const [statusFilter,     setStatusFilter]     = useState('all');
  const [supabaseMeds,     setSupabaseMeds]     = useState([]);
  const [loadingSupabase,  setLoadingSupabase]  = useState(true);

  // Fetch real medications from Supabase when the page loads
  useEffect(() => {
    fetchSupabaseMedications()
      .then(rows => setSupabaseMeds(rows))
      .finally(() => setLoadingSupabase(false));
  }, []);

  // Mock data (always present — never removed)
  const mockMedications = getAllMedications();

  // Merge: mock first, then Supabase rows that aren't duplicates
  const mockIds = new Set(mockMedications.map(m => String(m.id)));
  const newFromSupabase = supabaseMeds.filter(m => !mockIds.has(String(m.id)));
  const medications = [...mockMedications, ...newFromSupabase];

  const filtered = medications.filter(m => {
    const matchSearch =
      !search ||
      m.name?.toLowerCase().includes(search.toLowerCase())       ||
      m.reason?.toLowerCase().includes(search.toLowerCase())     ||
      m.prescriber?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || m.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const currentCount = medications.filter(m => m.status === 'current').length;
  const pastCount    = medications.filter(m => m.status === 'past').length;

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display font-bold text-2xl text-slate-800">Medications</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Current and past medications with plain-language explanations
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link to="/medications/export" className="btn-secondary text-sm flex items-center gap-1.5">
            <Download size={14} /> Export Medication List
          </Link>
          <Link to="/medications/add" className="btn-primary text-sm flex items-center gap-1.5">
            <Plus size={14} /> Add Medication
          </Link>
        </div>
      </div>

      {/* Count cards */}
      <div className="grid grid-cols-2 gap-4 max-w-xs">
        <div className="card text-center py-3">
          <p className="text-2xl font-display font-bold text-green-600">{currentCount}</p>
          <p className="text-xs text-slate-500 mt-0.5">Current</p>
        </div>
        <div className="card text-center py-3">
          <p className="text-2xl font-display font-bold text-slate-400">{pastCount}</p>
          <p className="text-xs text-slate-500 mt-0.5">Past</p>
        </div>
      </div>

      {/* Search + status filters */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search medications..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-teal-400 bg-white"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['all', 'current', 'past', 'paused', 'unsure'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium capitalize transition-colors ${
                statusFilter === s
                  ? 'bg-teal-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:border-teal-300'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Loading indicator */}
      {loadingSupabase && (
        <p className="text-xs text-slate-400 flex items-center gap-1.5">
          <span className="w-3 h-3 border border-slate-300 border-t-teal-400 rounded-full animate-spin inline-block" />
          Loading saved medications…
        </p>
      )}

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="card text-center py-12">
          <Pill size={32} className="text-slate-200 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No medications found</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {filtered.map(med => (
            <MedicationCard key={med.id} medication={med} />
          ))}
        </div>
      )}
    </div>
  );
}