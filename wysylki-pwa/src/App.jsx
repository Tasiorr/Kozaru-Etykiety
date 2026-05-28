import { useState } from 'react';
import { useAuth } from './hooks/useAuth';
import { usePackages } from './hooks/usePackages';
import { LoginScreen } from './components/LoginScreen';
import { TabBar } from './components/TabBar';
import { PackageList } from './components/PackageList';
import { CARRIERS } from './config';

export default function App() {
  const { token, login, logout, loading: authLoading } = useAuth();
  const [carrier, setCarrier] = useState(CARRIERS[0]);
  const { data, loading, errors, refresh, updateStatus } = usePackages(token);

  if (!token) {
    return <LoginScreen onLogin={login} loading={authLoading} />;
  }

  return (
    <div className="flex flex-col h-full bg-slate-900">
      <header className="bg-slate-800 border-b border-slate-700 pt-safe shrink-0">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
          <h1 className="text-lg font-bold text-slate-100 truncate">
            📦 <span className="hidden sm:inline">Kozaru Japanese Crafts — </span>Etykiety
          </h1>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={refresh}
              className="flex items-center gap-1.5 text-sm text-blue-400 font-medium py-2 px-3 rounded-lg active:bg-slate-700 min-h-[44px]"
              aria-label="Odśwież"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="hidden sm:inline">Odśwież</span>
            </button>
            <button
              onClick={logout}
              className="text-sm text-slate-500 py-2 px-3 rounded-lg active:bg-slate-700 min-h-[44px]"
            >
              Wyloguj
            </button>
          </div>
        </div>
        <div className="max-w-2xl mx-auto">
          <TabBar active={carrier} onChange={setCarrier} />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto">
          <PackageList
            packages={data[carrier] || []}
            loading={loading}
            error={errors[carrier] || null}
            token={token}
            onRefresh={refresh}
            onStatusChange={updateStatus}
          />
        </div>
      </div>


    </div>
  );
}
