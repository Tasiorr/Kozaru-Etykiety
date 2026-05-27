import { CARRIERS } from '../config';

const BRAND = {
  DHL:    { bg: 'bg-yellow-400', text: 'text-red-600',    active: 'bg-yellow-400/20 border-yellow-400' },
  Hermes: { bg: 'bg-emerald-500', text: 'text-white',     active: 'bg-emerald-500/20 border-emerald-500' },
  GLS:    { bg: 'bg-orange-400',  text: 'text-slate-900', active: 'bg-orange-400/20  border-orange-400' },
};

export function TabBar({ active, onChange }) {
  return (
    <div className="flex bg-slate-800">
      {Object.keys(BRAND).map(carrier => {
        const isActive = carrier === active;
        const enabled  = CARRIERS.includes(carrier);
        const brand    = BRAND[carrier];
        return (
          <button
            key={carrier}
            onClick={() => enabled && onChange(carrier)}
            className={`flex-1 py-2.5 flex flex-col items-center gap-1.5 transition-all ${
              !enabled ? 'opacity-25 cursor-not-allowed' : ''
            } ${isActive ? brand.active + ' border-b-2' : 'border-b-2 border-transparent'}`}
          >
            <span className={`px-3 py-0.5 rounded-md text-sm font-black tracking-wide ${brand.bg} ${brand.text}`}>
              {carrier}
            </span>
          </button>
        );
      })}
    </div>
  );
}
