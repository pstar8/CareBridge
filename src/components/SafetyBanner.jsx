import { ShieldCheck } from 'lucide-react';

export default function SafetyBanner({ compact = false }) {
  return (
    <div className={`bg-amber-50 border border-amber-200 rounded-lg flex gap-3 ${compact ? 'p-3' : 'p-4'}`}>
      <ShieldCheck className="text-amber-600 shrink-0 mt-0.5" size={compact ? 16 : 18} />
      <p className={`text-amber-800 ${compact ? 'text-xs' : 'text-sm'} leading-relaxed`}>
        <span className="font-semibold">Important: </span>
        CareBridge AI helps explain healthcare information in simpler language. It does not diagnose, recommend treatment, or replace advice from doctors, pharmacists, or NHS services. Always check the original letter and speak to a healthcare professional if unsure.
      </p>
    </div>
  );
}
