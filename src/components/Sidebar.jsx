import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Upload, Calendar, Pill, Heart, X, Stethoscope, Activity, UserCircle, Settings } from 'lucide-react';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/upload', icon: Upload, label: 'Upload Document' },
  { path: '/diagnosis', icon: Stethoscope, label: 'Explain Diagnosis' },
  { path: '/appointments', icon: Calendar, label: 'Appointments' },
  { path: '/medications', icon: Pill, label: 'Medications' },
  { path: '/conditions', icon: Activity, label: 'Conditions' },
  { path: '/profile', icon: UserCircle, label: 'Profile' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

export default function Sidebar({ isOpen, onClose }) {
  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-black/30 z-20 lg:hidden" onClick={onClose} />}
      <aside className={`fixed top-0 left-0 h-full w-64 bg-white border-r border-slate-200 z-30 transform transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:z-auto`}>
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center"><Heart size={16} className="text-white" /></div>
            <div><p className="font-display font-bold text-slate-800 text-sm leading-tight">CareBridge</p><p className="text-xs text-teal-600 font-semibold">AI</p></div>
          </div>
          <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>
        <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-10rem)]">
          {navItems.map(({ path, icon: Icon, label }) => (
            <NavLink key={path} to={path} end={path === '/'} onClick={onClose} className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <Icon size={18} /><span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-100 bg-white">
          <div className="bg-teal-50 rounded-lg p-3">
            <p className="text-xs font-semibold text-teal-700 mb-1">NHS Emergency</p>
            <p className="text-xs text-teal-600">Call 999 for emergencies</p>
            <p className="text-xs text-teal-600">Call 111 for urgent advice</p>
          </div>
        </div>
      </aside>
    </>
  );
}
