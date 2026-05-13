import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { setUser, addNotification } from '../utils/storage';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const login = (e) => { e.preventDefault(); const user = { fullName: localStorage.getItem('carebridge_registered_name') || 'Demo User', email, role: 'Family member', preferredLanguage: 'urdu' }; setUser(user); addNotification('Logged in successfully', 'profile'); window.dispatchEvent(new Event('carebridge-notifications')); navigate('/'); };
  return <div className="max-w-md mx-auto card"><h1 className="font-display font-bold text-2xl text-slate-800 mb-1">Log in</h1><p className="text-sm text-slate-500 mb-5">Mock login for the frontend prototype.</p><form onSubmit={login} className="space-y-4"><label className="block"><span className="text-xs font-medium text-slate-600">Email</span><input value={email} onChange={e=>setEmail(e.target.value)} type="email" required className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"/></label><label className="block"><span className="text-xs font-medium text-slate-600">Password</span><input value={password} onChange={e=>setPassword(e.target.value)} type="password" required className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"/></label><button className="btn-primary w-full">Log in</button></form><p className="text-sm text-slate-500 mt-4 text-center">No account? <Link className="text-teal-600 font-semibold" to="/register">Register</Link></p></div>;
}
