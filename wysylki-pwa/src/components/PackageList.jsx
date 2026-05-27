import { useState } from 'react';
import { PackageCard } from './PackageCard';

export function PackageList({ packages, loading, error, token, onRefresh, onStatusChange }) {
  const [hideSent, setHideSent] = useState(false);
  const filtered = hideSent ? packages.filter(p => p.status !== 'Wysłana') : packages;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="flex items-center justify-between px-4 py-3">
        <p className="text-sm text-slate-500">
          {loading ? 'Odświeżanie…' : `${filtered.length} paczek`}
        </p>
        <button
          onClick={() => setHideSent(v => !v)}
          className="text-sm text-blue-400 font-medium py-1 px-2 -mr-2"
        >
          {hideSent ? 'Pokaż wysłane' : 'Ukryj wysłane'}
        </button>
      </div>

      {error && (
        <div className="mx-4 mb-3 p-3 bg-red-900/40 border border-red-800 rounded-xl text-sm text-red-400">
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
        {filtered.map(pkg => (
          <PackageCard key={pkg.id} pkg={pkg} token={token} onStatusChange={onStatusChange} />
        ))}
      </div>
    </div>
  );
}
