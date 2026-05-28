import { useState, useEffect } from 'react';
import { markAsSent, markAsNew, markVintedAsSent, markVintedAsNew } from '../api/sheets';

function extractFileId(driveUrl) {
  return driveUrl?.match(/\/d\/([a-zA-Z0-9_-]+)/)?.[1] || null;
}

// Dostosuj te wartości do pozycji QR kodu na etykiecie Vinted:
// ZOOM_W / ZOOM_H — wymiary iframe (szerszy = większy zoom)
// PAN_X — przesunięcie w lewo (ujemna = scrolluj w prawo)
// PAN_Y — przesunięcie w górę (ujemna = scrolluj w dół, do QR kodu)
// Szerokość iframe = zoom (im szersza, tym większy QR)
// PAN_X ujemne = przesuń w prawo strony
// PAN_Y ujemne = przesuń w dół (skip toolbar Drive)
const VINTED_ZOOM_W = 1000;
const VINTED_ZOOM_H = 1200;
const VINTED_PAN_X  = -575;
const VINTED_PAN_Y  = -120;
const VINTED_BOX    = 280; // szerokość = wysokość kwadratu

function PDFEmbed({ fileId }) {
  if (!fileId) return (
    <p className="text-sm text-slate-500 text-center py-4">⚠️ Brak etykiety</p>
  );
  return (
    <div
      className="overflow-hidden rounded-2xl mx-auto"
      style={{ width: `${VINTED_BOX}px`, height: `${VINTED_BOX}px`, position: 'relative' }}
    >
      <iframe
        src={`https://drive.google.com/file/d/${fileId}/preview`}
        style={{
          position: 'absolute',
          width:  `${VINTED_ZOOM_W}px`,
          height: `${VINTED_ZOOM_H}px`,
          top:  `${VINTED_PAN_Y}px`,
          left: `${VINTED_PAN_X}px`,
          border: 'none',
        }}
        title="Etykieta PDF"
      />
    </div>
  );
}

const qrCache = new Map();

function QRImage({ fileId, token }) {
  const [src, setSrc] = useState(() => qrCache.get(fileId) || null);
  const [loading, setLoading] = useState(!fileId || !qrCache.has(fileId));
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!fileId) { setLoading(false); setError(true); return; }
    if (qrCache.has(fileId)) { setSrc(qrCache.get(fileId)); setLoading(false); return; }

    fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => { if (!r.ok) throw new Error(r.status); return r.blob(); })
      .then(blob => {
        const url = URL.createObjectURL(blob);
        qrCache.set(fileId, url);
        setSrc(url);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [fileId, token]);

  if (loading) return (
    <div className="flex flex-col items-center gap-2 py-2 w-full">
      <div className="w-56 h-56 bg-slate-700 rounded-2xl animate-pulse" />
      <p className="text-xs text-slate-500">Ładowanie etykiety…</p>
    </div>
  );
  if (error || !src) return (
    <p className="text-sm text-slate-500 text-center py-4">⚠️ Brak etykiety</p>
  );
  return <img src={src} alt="Etykieta QR" className="w-full max-w-xs rounded-2xl mx-auto block" />;
}

function Checkbox({ checked, pending }) {
  return (
    <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all duration-150 ${
      checked ? 'bg-blue-500 border-blue-500' : 'border-slate-500 bg-transparent'
    } ${pending ? 'opacity-40' : ''}`}>
      {checked && (
        <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      )}
    </div>
  );
}

function addressLine(pkg) {
  const cityPart = [pkg.postcode, pkg.city].filter(Boolean).join(' ');
  return [pkg.street, cityPart, pkg.country].filter(Boolean).join(' · ');
}

export function PackageCard({ pkg, token, onStatusChange }) {
  const [expanded, setExpanded] = useState(false);
  const [pending, setPending] = useState(false);
  const isSent    = pkg.status === 'Wysłana';
  const isVinted  = pkg.source === 'vinted';
  const fileId    = extractFileId(pkg.labelUrl);
  const hasAddress = !isVinted && (pkg.street || pkg.city);
  const displayName = isVinted
    ? (pkg.bestellung || pkg.trackingNumber)
    : `${pkg.firstName} ${pkg.lastName}`.trim();

  async function handleCheck() {
    if (pending) return;
    const newStatus = isSent ? 'Nowa' : 'Wysłana';
    onStatusChange(pkg.id, newStatus);
    setPending(true);
    try {
      const isVinted = pkg.source === 'vinted';
      if (isVinted) {
        if (isSent) await markVintedAsNew(pkg.rowIndex, token);
        else await markVintedAsSent(pkg.rowIndex, token);
      } else {
        if (isSent) await markAsNew(pkg.carrier, pkg.rowIndex, token);
        else await markAsSent(pkg.carrier, pkg.rowIndex, token);
      }
    } catch (err) {
      onStatusChange(pkg.id, pkg.status);
      alert('Błąd zapisu: ' + err.message);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={`rounded-2xl border mx-3 mb-3 overflow-hidden transition-opacity ${
      isSent
        ? 'bg-slate-800/50 border-slate-700/50 opacity-60'
        : 'bg-slate-800 border-slate-700'
    }`}>
      <div className="flex items-stretch">
        {/* Strefa checkbox — osobny tap target */}
        <button
          onClick={handleCheck}
          disabled={pending}
          aria-label={isSent ? 'Oznacz jako nowa' : 'Oznacz jako wysłana'}
          className="w-14 shrink-0 flex items-center justify-center active:bg-slate-700/50 transition-colors"
        >
          <Checkbox checked={isSent} pending={pending} />
        </button>

        {/* Strefa rozwijania */}
        <button
          onClick={() => setExpanded(v => !v)}
          className="flex-1 min-w-0 py-3.5 pr-4 text-left flex items-center gap-2 active:bg-slate-700/30"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              {isVinted && (
                <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#009e60] text-white leading-none">
                  V
                </span>
              )}
              <p className={`font-semibold truncate leading-tight ${
                isVinted ? 'text-xs sm:text-sm text-slate-200' : 'text-base text-slate-100'
              } ${isSent ? 'line-through text-slate-500' : ''}`}>
                {displayName}
              </p>
            </div>

            <div className="flex items-center gap-3 mt-1 flex-wrap">
              {isVinted && pkg.empfaenger && (
                <span className="flex items-center gap-1 text-xs font-semibold text-[#00c978] shrink-0">
                  <span>👤</span>
                  <span className="truncate">{pkg.empfaenger}</span>
                </span>
              )}
              <span className="flex items-center gap-1 text-xs text-slate-300">
                <span>📦</span>
                <span className="font-mono truncate max-w-[130px] sm:max-w-none">{pkg.trackingNumber}</span>
              </span>
              {pkg.shipDate && (
                <span className="flex items-center gap-1 text-xs text-slate-300 shrink-0">
                  <span>📅</span>
                  <span>{pkg.shipDate}</span>
                </span>
              )}
            </div>

            {hasAddress && (
              <span className="flex items-center gap-1 text-xs text-slate-300 mt-0.5">
                <span className="shrink-0">📍</span>
                <span className="truncate">{addressLine(pkg)}</span>
              </span>
            )}
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
      </div>

      {expanded && (
        <div className="border-t border-slate-700 px-4 py-4 flex flex-col gap-4">
          {hasAddress && (
            <div className="text-sm space-y-0.5">
              {pkg.street && <p className="text-slate-300">{pkg.street}</p>}
              <p className="text-slate-400">{[pkg.postcode, pkg.city, pkg.country].filter(Boolean).join(' · ')}</p>
            </div>
          )}

          <div className="flex flex-col items-center gap-2">
            <p className="text-xs text-slate-500 font-medium tracking-widest uppercase self-start">
              {isVinted ? 'Etykieta PDF' : 'Etykieta QR'}
            </p>
            {isVinted
              ? <PDFEmbed fileId={fileId} />
              : <QRImage fileId={fileId} token={token} />
            }
          </div>

          {pkg.labelUrl && (
            <a
              href={pkg.labelUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-center bg-slate-700 hover:bg-slate-600 active:bg-slate-600 text-slate-200 text-sm font-medium py-3.5 rounded-xl transition-colors"
            >
              Otwórz w Google Drive
            </a>
          )}
        </div>
      )}
    </div>
  );
}
