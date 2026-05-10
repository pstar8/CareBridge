import { useState } from 'react';
import { Search, Calendar, SlidersHorizontal } from 'lucide-react';
import AppointmentCard from '../components/AppointmentCard';
import { getAllAppointments } from '../utils/dataAccess';

const statuses = ['all', 'upcoming', 'past', 'cancelled'];

export default function Appointments() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [hospitalFilter, setHospitalFilter] = useState('');

  const appointments = getAllAppointments();
  const hospitals = [...new Set(appointments.map(a => a.hospital))];

  const filtered = appointments.filter(a => {
    const matchSearch = !search || 
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.hospital.toLowerCase().includes(search.toLowerCase()) ||
      a.doctor.toLowerCase().includes(search.toLowerCase()) ||
      a.type.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || a.status === statusFilter;
    const matchHospital = !hospitalFilter || a.hospital === hospitalFilter;
    return matchSearch && matchStatus && matchHospital;
  });

  const counts = {
    upcoming: appointments.filter(a => a.status === 'upcoming').length,
    past: appointments.filter(a => a.status === 'past').length,
    cancelled: appointments.filter(a => a.status === 'cancelled').length,
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-slate-800">Appointments</h1>
          <p className="text-slate-500 text-sm mt-0.5">All your healthcare appointments in one place</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-center">
            <p className="font-bold text-blue-600 text-lg leading-none">{counts.upcoming}</p>
            <p className="text-xs text-slate-400 mt-0.5">Upcoming</p>
          </div>
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex gap-2 flex-wrap">
        {statuses.map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium capitalize transition-colors ${
              statusFilter === s
                ? 'bg-teal-600 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:border-teal-300'
            }`}
          >
            {s === 'all' ? `All (${appointments.length})` : `${s.charAt(0).toUpperCase() + s.slice(1)} (${counts[s] || 0})`}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search appointments..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-teal-400 bg-white"
          />
        </div>
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={14} className="text-slate-400" />
          <select
            value={hospitalFilter}
            onChange={e => setHospitalFilter(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-teal-400 bg-white text-slate-600"
          >
            <option value="">All hospitals</option>
            {hospitals.map(h => <option key={h} value={h}>{h}</option>)}
          </select>
        </div>
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="card text-center py-12">
          <Calendar size={32} className="text-slate-200 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No appointments found</p>
          <p className="text-slate-400 text-sm mt-1">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {filtered.map(appt => (
            <AppointmentCard key={appt.id} appointment={appt} />
          ))}
        </div>
      )}
    </div>
  );
}
