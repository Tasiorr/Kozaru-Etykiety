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
  const { packages, loading, error, refresh, updateStatus } = usePackages(carrier, token);

  if (!token) {
    return <LoginScreen onLogin={login} loading={authLoading} />;
  }

  return (
    <div className="flex flex-col h-full bg-slate-900">
      <header className="bg-slate-800 border-b border-slate-700 pt-safe shrink-0">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-xl font-bold text-slate-100">📦 Kozaru Japanese Crafts — Etykiety</h1>
          <div className="flex items-center gap-1">
            <button
              onClick={refresh}
              className="text-sm text-blue-400 font-medium py-2 px-3 rounded-lg active:bg-slate-700"
            >
              Odśwież
            </button>
            <button
              onClick={logout}
              className="text-sm text-slate-500 py-2 px-3 rounded-lg active:bg-slate-700"
            >
              Wyloguj
            </button>
          </div>
        </div>
        <TabBar active={carrier} onChange={setCarrier} />
      </header>

      <PackageList
        packages={packages}
        loading={loading}
        error={error}
        token={token}
        onRefresh={refresh}
        onStatusChange={updateStatus}
      />
    </div>
  );
}
