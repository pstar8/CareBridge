import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, Search, Plus, ChevronRight } from 'lucide-react';
import { getAllConditions, getAllMedications, getAllAppointments } from '../utils/dataAccess';

export default function Conditions() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const conditions = getAllConditions();
  const meds = getAllMedications();
  const appts = getAllAppointments();
  const filtered = conditions.filter(c => {
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.summary.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || c.status === filter;
    return matchSearch && matchFilter;
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="font-display font-bold text-2xl text-slate-800">Conditions</h1><p className="text-sm text-slate-500 mt-1">See diagnoses and connect them to medications, appointments, documents, and questions.</p></div><Link to="/diagnosis" className="btn-primary flex items-center gap-2"><Plus size={15}/>Explain / Add Condition</Link></div>
      <div className="flex flex-wrap gap-3"><div className="relative flex-1 min-w-56"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search conditions..." className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-teal-400 bg-white"/></div>{['all','active','needs follow-up','past/resolved'].map(s => <button key={s} onClick={()=>setFilter(s)} className={`px-4 py-1.5 rounded-full text-sm font-medium capitalize ${filter===s ? 'bg-teal-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-teal-300'}`}>{s}</button>)}</div>
      <div className="grid md:grid-cols-2 gap-4">{filtered.map(c => { const relatedMeds = meds.filter(m => c.relatedMedicationIds?.map(String).includes(String(m.id))); const relatedAppts = appts.filter(a => c.relatedAppointmentIds?.map(String).includes(String(a.id))); return <div key={c.id} className="card hover:shadow-md transition"><div className="flex items-start justify-between gap-3 mb-3"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center"><Activity size={18} className="text-green-600"/></div><div><h2 className="font-semibold text-slate-800">{c.name}</h2><span className="badge badge-teal text-xs capitalize">{c.status}</span></div></div><Link to={`/conditions/${c.id}`} className="text-teal-600"><ChevronRight size={18}/></Link></div><p className="text-sm text-slate-600 leading-relaxed mb-3 line-clamp-3">{c.summary}</p><div className="grid grid-cols-2 gap-2 text-center"><div className="bg-slate-50 rounded-lg p-2"><p className="font-bold text-purple-600">{relatedMeds.length}</p><p className="text-xs text-slate-500">Medications</p></div><div className="bg-slate-50 rounded-lg p-2"><p className="font-bold text-blue-600">{relatedAppts.length}</p><p className="text-xs text-slate-500">Appointments</p></div></div></div>})}</div>
      {filtered.length === 0 && <div className="card text-center py-12"><Activity size={32} className="text-slate-200 mx-auto mb-3"/><p className="text-slate-500 font-medium">No conditions found</p></div>}
    </div>
  );
}
