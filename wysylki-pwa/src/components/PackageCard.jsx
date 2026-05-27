import { useState, useEffect } from 'react';
import { markAsSent, markAsNew } from '../api/sheets';

function extractFileId(driveUrl) {
  return driveUrl?.match(/\/d\/([a-zA-Z0-9_-]+)/)?.[1] || null;
}

function QRImage({ fileId, token }) {
  const [src, setSrc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!fileId) { setLoading(false); setError(true); return; }
    let objectUrl;
    fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => { if (!r.ok) throw new Error(r.status); return r.blob(); })
      .then(blob => { objectUrl = URL.createObjectURL(blob); setSrc(objectUrl); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [fileId, token]);

  if (loading) return (
    <div className="flex flex-col items-center gap-2 py-2">
      <div className="w-56 h-56 bg-slate-700 rounded-2xl animate-pulse" />
      <p className="text-xs text-slate-500">Ładowanie etykiety…</p>
    </div>
  );
  if (error || !src) return (
    <p className="text-sm text-slate-500 text-center py-4">⚠️ Brak etykiety</p>
  );
  return <img src={src} alt="Etykieta QR" className="w-full max-w-xs rounded-2xl mx-auto block" />;
}

export function PackageCard({ pkg, token, onRefresh }) {
  const [expanded, setExpanded] = useState(false);
  const [marking, setMarking] = useState(false);
  const isSent = pkg.status === 'Wysłana';
  const fileId = extractFileId(pkg.labelUrl);

  async function handleCheck(e) {
    e.stopPropagation();
    if (marking) return;
    setMarking(true);
    try {
      if (isSent) {
        await markAsNew(pkg.carrier, pkg.rowIndex, token);
      } else {
        await markAsSent(pkg.carrier, pkg.rowIndex, token);
      }
      onRefresh();
    } catch (err) {
      alert('Błąd: ' + err.message);
      setMarking(false);
    }
  }

  return (
    <div className={`rounded-2xl border mx-4 mb-3 overflow-hidden transition-opacity ${
      isSent
        ? 'bg-slate-800/50 border-slate-700/50 opacity-50'
        : 'bg-slate-800 border-slate-700'
    }`}>
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full px-4 py-3.5 flex items-center gap-3 text-left active:bg-slate-700/50"
      >
        <input
          type="checkbox"
          checked={isSent}
          disabled={marking}
          onClick={handleCheck}
          onChange={() => {}}
          className="w-5 h-5 shrink-0 cursor-pointer accent-blue-500"
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-base">👤</span>
            <span className={`text-base font-semibold ${isSent ? 'line-through text-slate-500' : 'text-slate-100'}`}>
              {pkg.firstName} {pkg.lastName}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="flex items-center gap-1 text-sm text-slate-400">
              <span>📦</span>
              <span className="font-mono">{pkg.trackingNumber}</span>
            </span>
            {pkg.shipDate && (
              <span className="flex items-center gap-1 text-sm text-slate-400">
                <span>📅</span>
                <span>{pkg.shipDate}</span>
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
            isSent
              ? 'bg-slate-700 text-slate-400'
              : 'bg-green-900/60 text-green-400 border border-green-800'
          }`}>
            {isSent ? '✓ Wysłana' : '● Nowa'}
          </span>
          <svg
            className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-slate-700 px-4 py-5 flex flex-col items-center gap-3">
          <p className="text-xs text-slate-500 font-medium tracking-widest uppercase">Etykieta QR</p>
          <QRImage fileId={fileId} token={token} />
        </div>
      )}
    </div>
  );
}
