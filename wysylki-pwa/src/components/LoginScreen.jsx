export function LoginScreen({ onLogin, loading }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 px-6">
      <div className="text-center mb-10">
        <div className="text-6xl mb-4">📦</div>
        <h1 className="text-3xl font-bold text-slate-100">Wysyłki</h1>
        <p className="text-slate-400 mt-2 text-base">Zarządzaj paczkami z telefonu</p>
      </div>
      <button
        onClick={onLogin}
        disabled={loading}
        className="w-full max-w-xs bg-blue-600 text-white text-lg font-semibold py-4 rounded-2xl shadow-md active:bg-blue-700 disabled:opacity-50 transition-opacity"
      >
        {loading ? 'Łączenie…' : 'Zaloguj przez Google'}
      </button>
    </div>
  );
}
