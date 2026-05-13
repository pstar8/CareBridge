import { Calendar, Clock, MapPin, User, ChevronRight, StickyNote } from 'lucide-react';
import { Link } from 'react-router-dom';

const statusConfig = {
  upcoming: { label: 'Upcoming', className: 'badge-blue' },
  past: { label: 'Past', className: 'badge-gray' },
  cancelled: { label: 'Cancelled', className: 'badge-red' },
};

export default function AppointmentCard({ appointment }) {
  const status = statusConfig[appointment.status] || statusConfig.upcoming;
  let hasNotes = false;
  try {
    const notes = JSON.parse(localStorage.getItem('carebridge_appointment_notes') || '{}')[appointment.id];
    hasNotes = notes && Object.values(notes).some(Boolean);
  } catch {}

  return (
    <div className="card hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="font-semibold text-slate-800 text-sm leading-tight">{appointment.title}</h3>
        <span className={`badge ${status.className} shrink-0`}>{status.label}</span>
      </div>

      <div className="space-y-1.5 mb-4">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Calendar size={14} className="shrink-0" />
          <span>{new Date(appointment.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Clock size={14} className="shrink-0" />
          <span>{appointment.time}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <MapPin size={14} className="shrink-0" />
          <span className="truncate">{appointment.hospital}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <User size={14} className="shrink-0" />
          <span>{appointment.doctor}</span>
        </div>
      </div>

      {hasNotes && <div className="mb-3 flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 rounded-lg px-2 py-1.5"><StickyNote size={13}/> Notes saved for this appointment</div>}

      <div className="flex items-center justify-between">
        <span className="badge badge-teal text-xs">{appointment.type}</span>
        <Link
          to={`/appointments/${appointment.id}`}
          className="flex items-center gap-1 text-sm font-semibold text-teal-600 hover:text-teal-700"
        >
          View Details <ChevronRight size={14} />
        </Link>
      </div>
    </div>
  );
}
