import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import UploadLetter from './pages/UploadLetter';
import Results from './pages/Results';
import Appointments from './pages/Appointments';
import AppointmentDetails from './pages/AppointmentDetails';
import Medications from './pages/Medications';
import MedicationDetails from './pages/MedicationDetails';
import AddMedication from './pages/AddMedication';
import DiagnosisExplainer from './pages/DiagnosisExplainer';
import Conditions from './pages/Conditions';
import ConditionDetails from './pages/ConditionDetails';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import MedicationExport from './pages/MedicationExport';

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settings, setSettings] = useState(() => {
    try { return JSON.parse(localStorage.getItem('carebridge_settings')) || {}; } catch { return {}; }
  });

  useEffect(() => {
    const refresh = () => {
      try { setSettings(JSON.parse(localStorage.getItem('carebridge_settings')) || {}); } catch { setSettings({}); }
    };
    window.addEventListener('carebridge-settings', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('carebridge-settings', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  return (
    <BrowserRouter>
      <div className={`flex h-screen overflow-hidden bg-slate-50 ${settings.largeText ? 'large-text' : ''} ${settings.highContrast ? 'high-contrast' : ''}`}>
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <Navbar onMenuClick={() => setSidebarOpen(true)} />
          <main className="flex-1 overflow-y-auto p-4 lg:p-6">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/upload" element={<UploadLetter />} />
              <Route path="/results" element={<Results />} />
              <Route path="/diagnosis" element={<DiagnosisExplainer />} />
              <Route path="/appointments" element={<Appointments />} />
              <Route path="/appointments/:id" element={<AppointmentDetails />} />
              <Route path="/medications" element={<Medications />} />
              <Route path="/medications/add" element={<AddMedication />} />
              <Route path="/medications/:id/edit" element={<AddMedication editMode />} />
              <Route path="/medications/export" element={<MedicationExport />} />
              <Route path="/medications/:id" element={<MedicationDetails />} />
              <Route path="/conditions" element={<Conditions />} />
              <Route path="/conditions/:id" element={<ConditionDetails />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}
