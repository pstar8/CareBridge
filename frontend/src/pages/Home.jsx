import { Link } from 'react-router-dom';
import { Upload, Calendar, Pill, FileText, ArrowRight, Heart, Activity, UserPlus } from 'lucide-react';
import SafetyBanner from '../components/SafetyBanner';
import { getAllAppointments, getAllMedications, getAllConditions } from '../utils/dataAccess';
import { getUser } from '../utils/storage';

const quickActions = [
  { icon: Upload, title: 'Upload Medical Letter', description: 'Get a plain-language explanation of any healthcare letter or document.', color: 'bg-teal-50 text-teal-600', path: '/upload' },
  { icon: FileText, title: 'Explain a Diagnosis', description: 'Ask the AI to explain a diagnosis in a chat-style flow.', color: 'bg-amber-50 text-amber-600', path: '/diagnosis' },
  { icon: Calendar, title: 'View Appointments', description: 'Manage appointment details, notes, files, and questions.', color: 'bg-blue-50 text-blue-600', path: '/appointments' },
  { icon: Pill, title: 'View Medications', description: 'Track current and past medicines with simple explanations.', color: 'bg-purple-50 text-purple-600', path: '/medications' },
  { icon: Activity, title: 'View Conditions', description: 'Connect conditions to medicines, appointments, and notes.', color: 'bg-green-50 text-green-600', path: '/conditions' },
];

export default function Home() {
  const appointments = getAllAppointments();
  const medications = getAllMedications();
  const conditions = getAllConditions();
  const user = getUser();
  const upcoming = appointments.filter(a => a.status === 'upcoming').length;
  const current = medications.filter(m => m.status === 'current').length;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {!user && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-sm text-blue-800">You are using demo mode. Register or log in to save your records.</p>
          <Link to="/register" className="btn-secondary text-sm flex items-center justify-center gap-2"><UserPlus size={15}/> Create profile</Link>
        </div>
      )}

      <div className="bg-gradient-to-br from-teal-600 to-teal-800 rounded-2xl p-7 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-12 translate-x-12" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-3"><div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center"><Heart size={18} /></div><span className="font-display font-bold text-lg">CareBridge AI</span></div>
          <h1 className="font-display font-bold text-2xl sm:text-3xl mb-2 leading-tight">Making healthcare information<br />clear for every family</h1>
          <p className="text-teal-100 text-sm leading-relaxed max-w-xl mb-5">Understand letters, diagnoses, appointments, medicines, and conditions in simple language — with translation and read-aloud support.</p>
          <div className="flex flex-wrap gap-3">
            <Link to="/upload" className="inline-flex items-center gap-2 bg-white text-teal-700 font-semibold text-sm px-5 py-2.5 rounded-lg hover:bg-teal-50 transition-colors">Upload a Document <ArrowRight size={16} /></Link>
            <Link to="/diagnosis" className="inline-flex items-center gap-2 bg-teal-500/30 text-white border border-white/30 font-semibold text-sm px-5 py-2.5 rounded-lg hover:bg-white/10 transition-colors">Explain Diagnosis</Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card text-center"><p className="text-3xl font-display font-bold text-teal-600 mb-1">{upcoming}</p><p className="text-xs text-slate-500 font-medium">Upcoming Appointments</p></div>
        <div className="card text-center"><p className="text-3xl font-display font-bold text-purple-600 mb-1">{current}</p><p className="text-xs text-slate-500 font-medium">Current Medications</p></div>
        <div className="card text-center"><p className="text-3xl font-display font-bold text-green-600 mb-1">{conditions.length}</p><p className="text-xs text-slate-500 font-medium">Conditions</p></div>
        <div className="card text-center"><p className="text-3xl font-display font-bold text-amber-600 mb-1">3</p><p className="text-xs text-slate-500 font-medium">Linked Documents</p></div>
      </div>

      <div>
        <h2 className="font-display font-bold text-slate-800 text-lg mb-4">Quick Actions</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickActions.map(({ icon: Icon, title, description, color, path }) => (
            <Link key={title} to={path} className="card hover:shadow-md transition-all hover:border-teal-200 group">
              <div className="flex items-start gap-4"><div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${color}`}><Icon size={22} /></div><div className="flex-1 min-w-0"><h3 className="font-semibold text-slate-800 text-sm mb-1 group-hover:text-teal-700 transition-colors">{title}</h3><p className="text-xs text-slate-500 leading-relaxed">{description}</p></div><ArrowRight size={16} className="text-slate-300 group-hover:text-teal-500 transition-colors mt-1" /></div>
            </Link>
          ))}
        </div>
      </div>
      <SafetyBanner />
    </div>
  );
}
