import { useEffect, useState } from 'react';
import { Menu, Heart, Bell, CheckCheck, Trash2, UserCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { KEYS, readStorage, writeStorage, getUser } from '../utils/storage';

const defaultNotifications = [
  { id: 1, message: 'Upcoming appointment tomorrow at 10:30 AM', type: 'appointment', read: false, createdAt: new Date().toISOString() },
  { id: 2, message: 'Remember to bring your medication list to your appointment', type: 'reminder', read: false, createdAt: new Date().toISOString() },
];

export default function Navbar({ onMenuClick }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState(() => readStorage(KEYS.notifications, defaultNotifications));
  const [user, setUserState] = useState(() => getUser());

  useEffect(() => {
    const refresh = () => {
      setNotifications(readStorage(KEYS.notifications, defaultNotifications));
      setUserState(getUser());
    };
    window.addEventListener('carebridge-notifications', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('carebridge-notifications', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  const unread = notifications.filter(n => !n.read).length;
  const save = (next) => { setNotifications(next); writeStorage(KEYS.notifications, next); };

  return (
    <header className="bg-white border-b border-slate-200 h-14 flex items-center px-4 gap-4 lg:px-6 relative z-10">
      <button onClick={onMenuClick} className="lg:hidden text-slate-500 hover:text-slate-700 p-1"><Menu size={22} /></button>
      <Link to="/" className="flex items-center gap-2 lg:hidden">
        <div className="w-7 h-7 bg-teal-600 rounded-lg flex items-center justify-center"><Heart size={14} className="text-white" /></div>
        <span className="font-display font-bold text-slate-800 text-sm">CareBridge AI</span>
      </Link>
      <div className="ml-auto flex items-center gap-3">
        <div className="relative">
          <button onClick={() => setOpen(!open)} className="relative text-slate-500 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-50">
            <Bell size={20} />
            {unread > 0 && <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 bg-teal-600 text-white rounded-full text-[10px] flex items-center justify-center font-bold">{unread}</span>}
          </button>
          {open && (
            <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
              <div className="p-3 border-b border-slate-100 flex items-center justify-between">
                <p className="font-semibold text-sm text-slate-800">Notifications</p>
                <div className="flex gap-2">
                  <button onClick={() => save(notifications.map(n => ({ ...n, read: true })))} className="text-xs text-teal-600 flex items-center gap-1"><CheckCheck size={13}/>Read all</button>
                  <button onClick={() => save([])} className="text-xs text-red-600 flex items-center gap-1"><Trash2 size={13}/>Clear</button>
                </div>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? <p className="p-4 text-sm text-slate-500 text-center">No notifications yet.</p> : notifications.map(n => (
                  <button key={n.id} onClick={() => save(notifications.map(item => item.id === n.id ? { ...item, read: true } : item))} className={`w-full text-left p-3 border-b border-slate-50 hover:bg-slate-50 ${!n.read ? 'bg-teal-50/60' : ''}`}>
                    <p className="text-sm text-slate-700">{n.message}</p>
                    <p className="text-[11px] text-slate-400 mt-1">{new Date(n.createdAt).toLocaleString('en-GB')}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <Link to={user ? '/profile' : '/login'} className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center" title={user ? user.fullName : 'Login'}>
          {user?.fullName ? <span className="text-sm font-semibold text-teal-700">{user.fullName.charAt(0).toUpperCase()}</span> : <UserCircle size={20} className="text-teal-700" />}
        </Link>
      </div>
    </header>
  );
}
