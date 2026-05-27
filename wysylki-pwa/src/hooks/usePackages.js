import { useState, useEffect, useCallback } from 'react';
import { fetchPackages } from '../api/sheets';

export function usePackages(carrier, token) {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      setPackages(await fetchPackages(carrier, token));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [carrier, token]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 60_000);
    return () => clearInterval(id);
  }, [refresh]);

  return { packages, loading, error, refresh };
}
