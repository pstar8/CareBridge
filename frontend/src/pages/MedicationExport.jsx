import { Link } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';
import { getAllMedications } from '../utils/dataAccess';
import { getUser } from '../utils/storage';

export default function MedicationExport() {
  const meds = getAllMedications();
  const user = getUser();
  const current = meds.filter(m=>m.status==='current');
  const past = meds.filter(m=>m.status!=='current');
  const Table = ({items}) => <div className="overflow-x-auto"><table className="w-full text-sm border border-slate-200"><thead className="bg-slate-100"><tr>{['Name','Dose','Frequency','Timing','Reason','Status','Prescriber','Notes'].map(h=><th key={h} className="text-left p-2 border">{h}</th>)}</tr></thead><tbody>{items.map(m=><tr key={m.id}>{[m.name,m.dose,m.frequency,m.timing,m.reason,m.status,m.prescriber,m.notes].map((v,i)=><td key={i} className="p-2 border align-top">{v || '-'}</td>)}</tr>)}</tbody></table></div>;
  return <div className="max-w-5xl mx-auto space-y-5 print:p-0"><div className="flex items-center justify-between print:hidden"><Link to="/medications" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-teal-600 font-medium"><ArrowLeft size={16}/> Back to Medications</Link><button onClick={()=>window.print()} className="btn-primary flex items-center gap-2"><Printer size={15}/>Print / Save PDF</button></div><div className="card print:shadow-none print:border-0"><h1 className="font-display font-bold text-2xl text-slate-800">Medication Summary</h1><p className="text-sm text-slate-500">Patient: {user?.fullName || 'Demo Patient'} • Generated: {new Date().toLocaleDateString('en-GB')}</p><p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 mt-4">This medication list is for reference only. Always confirm medication instructions with a doctor, pharmacist, or official prescription.</p></div><div className="card print:shadow-none"><h2 className="font-semibold mb-3">Current medications</h2><Table items={current}/></div><div className="card print:shadow-none"><h2 className="font-semibold mb-3">Past / paused medications</h2><Table items={past}/></div></div>;
}
