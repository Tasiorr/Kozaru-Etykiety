import { useState } from 'react';
import { PackageCard } from './PackageCard';
import { MAX_SENT_VISIBLE } from '../config';

function parseShipDate(dateStr) {
  if (!dateStr) return 0;
  if (dateStr.includes('-')) return new Date(dateStr).getTime(); // YYYY-MM-DD
  const [d, m, y] = dateStr.split('.').map(Number);             // DD.MM.YYYY
  return new Date(y, m - 1, d).getTime();
}

function sortPackages(list) {
  return [...list].sort((a, b) => {
    const aSent = a.status === 'Wysłana';
    const bSent = b.status === 'Wysłana';
    if (aSent !== bSent) return aSent ? 1 : -1;
    return parseShipDate(b.shipDate) - parseShipDate(a.shipDate);
  });
}

export function PackageList({ packages, loading, error, token, onRefresh, onStatusChange }) {
  const [hideSent, setHideSent] = useState(true);

  const newPackages  = packages.filter(p => p.status !== 'Wysłana');
  const sentPackages = packages.filter(p => p.status === 'Wysłana')
                                .sort((a, b) => parseShipDate(b.shipDate) - parseShipDate(a.shipDate))
                                .slice(0, MAX_SENT_VISIBLE);
  const filtered = hideSent ? newPackages : [...newPackages, ...sentPackages];
  const sorted = sortPackages(filtered);

  return (
    <div className="pb-safe">
      <div className="flex items-center justify-between px-4 py-3">
        <p className="text-sm text-slate-500">
          {loading ? 'Odświeżanie…' : `${filtered.length} ${filtered.length === 1 ? 'paczka' : 'paczek'}`}
        </p>
        <button
          onClick={() => setHideSent(v => !v)}
          className={`text-xs font-semibold py-1.5 px-3 rounded-full transition-colors min-h-[36px] ${
            hideSent ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400'
          }`}
        >
          {hideSent ? 'Tylko nowe' : 'Wszystkie'}
        </button>
      </div>

      {error && (
        <div className="mx-3 mb-3 p-3 bg-red-900/40 border border-red-800 rounded-xl text-sm text-red-400">
          {error}
        </div>
      )}

      {filtered.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center py-20 text-slate-600">
          <span className="text-5xl mb-3">✓</span>
          <p className="font-medium">Brak paczek</p>
        </div>
      )}

      <div className="pb-6">
        {sorted.map(pkg => (
          <PackageCard key={pkg.id} pkg={pkg} token={token} onStatusChange={onStatusChange} />
        ))}
      </div>
    </div>
  );
}
