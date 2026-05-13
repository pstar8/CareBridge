import { Link, useNavigate } from 'react-router-dom';
import { UserCircle, LogOut, Settings } from 'lucide-react';
import { getUser, logoutUser } from '../utils/storage';
import { getAllAppointments, getAllConditions, getAllMedications } from '../utils/dataAccess';

export default function Profile() {
  const navigate = useNavigate();
  const user = getUser();
  const logout = () => { logoutUser(); window.dispatchEvent(new Event('carebridge-notifications')); navigate('/'); };
  if (!user) return <div className="max-w-xl mx-auto card text-center"><UserCircle size={42} className="mx-auto text-slate-300 mb-3"/><h1 className="font-display font-bold text-xl mb-2">Demo mode</h1><p className="text-sm text-slate-500 mb-4">Register or log in to save records under a profile.</p><div className="flex justify-center gap-3"><Link to="/login" className="btn-secondary">Login</Link><Link to="/register" className="btn-primary">Register</Link></div></div>;
  return <div className="max-w-3xl mx-auto space-y-5"><div className="card"><div className="flex items-start justify-between gap-4"><div className="flex items-center gap-4"><div className="w-14 h-14 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-xl">{user.fullName.charAt(0)}</div><div><h1 className="font-display font-bold text-2xl text-slate-800">{user.fullName}</h1><p className="text-sm text-slate-500">{user.email}</p><span className="badge badge-teal mt-2">{user.role}</span></div></div><button onClick={logout} className="btn-secondary flex items-center gap-2"><LogOut size={15}/>Logout</button></div></div><div className="grid sm:grid-cols-3 gap-4"><div className="card text-center"><p className="text-2xl font-bold text-green-600">{getAllConditions().length}</p><p className="text-xs text-slate-500">Conditions</p></div><div className="card text-center"><p className="text-2xl font-bold text-purple-600">{getAllMedications().length}</p><p className="text-xs text-slate-500">Medications</p></div><div className="card text-center"><p className="text-2xl font-bold text-blue-600">{getAllAppointments().length}</p><p className="text-xs text-slate-500">Appointments</p></div></div><Link to="/settings" className="btn-primary inline-flex items-center gap-2"><Settings size={15}/>Open Settings</Link></div>;
}
