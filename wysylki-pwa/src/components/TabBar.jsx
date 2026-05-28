import { CARRIERS } from '../config';

const BRAND = {
  DHL:    { border: 'border-yellow-400' },
  Hermes: { border: 'border-emerald-500' },
  GLS:    { border: 'border-orange-400' },
  DPD:    { border: 'border-red-600' },
};

export function TabBar({ active, onChange }) {
  return (
    <div className="flex bg-slate-800 border-b border-slate-700">
      {Object.keys(BRAND).map(carrier => {
        const isActive = carrier === active;
        const enabled  = CARRIERS.includes(carrier);
        const brand    = BRAND[carrier];
        return (
          <button
            key={carrier}
            onClick={() => enabled && onChange(carrier)}
            className={`flex-1 py-2.5 flex items-center justify-center transition-all min-h-[48px] ${
              !enabled ? 'opacity-25 cursor-not-allowed' : ''
            } ${isActive
                ? 'border-b-2 ' + brand.border
                : 'border-b-2 border-transparent'
            }`}
          >
            <div className={`px-3 py-1 rounded-lg bg-white transition-opacity ${
              !isActive && enabled ? 'opacity-70' : 'opacity-100'
            }`}>
              <img
                src={`${import.meta.env.BASE_URL}logo-${carrier.toLowerCase()}.svg`}
                alt={carrier}
                className="h-5 w-auto block"
                draggable="false"
              />
            </div>
          </button>
        );
      })}
    </div>
  );
}
