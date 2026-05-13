import { Pill, Clock, User, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function MedicationCard({ medication }) {
  const isCurrent = medication.status === 'current';

  return (
    <div className="card hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isCurrent ? 'bg-teal-100' : 'bg-slate-100'}`}>
            <Pill size={16} className={isCurrent ? 'text-teal-600' : 'text-slate-400'} />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 text-sm">{medication.name}</h3>
            <p className="text-xs text-slate-500">{medication.dose}</p>
          </div>
        </div>
        <span className={`badge ${isCurrent ? 'badge-green' : 'badge-gray'} shrink-0`}>
          {isCurrent ? 'Current' : 'Past'}
        </span>
      </div>

      <div className="space-y-1.5 mb-4">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Clock size={14} className="shrink-0" />
          <span>{medication.frequency} – {medication.timing}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <User size={14} className="shrink-0" />
          <span>{medication.prescriber}</span>
        </div>
      </div>

      <p className="text-xs text-slate-500 mb-3 bg-slate-50 rounded px-2 py-1.5">
        Reason: {medication.reason}
      </p>

      <div className="flex justify-end">
        <Link
          to={`/medications/${medication.id}`}
          className="flex items-center gap-1 text-sm font-semibold text-teal-600 hover:text-teal-700"
        >
          View Details <ChevronRight size={14} />
        </Link>
      </div>
    </div>
  );
}
