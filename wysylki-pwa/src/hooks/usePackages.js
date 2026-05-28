import { useState, useEffect, useCallback } from 'react';
import { fetchPackages, fetchVintedPackages } from '../api/sheets';
import { CARRIERS } from '../config';

export function usePackages(token) {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const refresh = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    const newData   = {};
    const newErrors = {};

    // Fetch all carrier sheets + Vinted in parallel
    const carrierResults = await Promise.allSettled(
      CARRIERS.map(carrier => fetchPackages(carrier, token))
    );
    CARRIERS.forEach((carrier, i) => {
      const r = carrierResults[i];
      if (r.status === 'fulfilled') newData[carrier] = r.value;
      else newErrors[carrier] = r.reason.message;
    });

    // Fetch Vinted sheet and distribute packages by carrier
    try {
      const vintedPkgs = await fetchVintedPackages(token);
      for (const pkg of vintedPkgs) {
        const c = pkg.carrier;
        if (!c) continue;
        if (!newData[c]) newData[c] = [];
        newData[c] = [...newData[c], pkg];
      }
    } catch (e) {
      newErrors['Vinted'] = e.message;
    }

    setData(prev => ({ ...prev, ...newData }));
    setErrors(newErrors);
    setLoading(false);
  }, [token]);

  const updateStatus = useCallback((id, newStatus) => {
    setData(prev => {
      const next = {};
      for (const c of Object.keys(prev)) {
        next[c] = prev[c].map(p => p.id === id ? { ...p, status: newStatus } : p);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 60_000);
    return () => clearInterval(id);
  }, [refresh]);

  return { data, loading, errors, refresh, updateStatus };
}
