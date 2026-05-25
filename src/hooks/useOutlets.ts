import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Outlet, UserOutlet } from '../types';

export function useUserOutlets() {
  const { user } = useAuth();
  const [userOutlets, setUserOutlets] = useState<UserOutlet[]>([]);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchUserOutlets = useCallback(async () => {
    if (!user) {
      setUserOutlets([]);
      setOutlets([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data: userOutletsData, error: userOutletsError } = await supabase
        .from('user_outlets')
        .select('*')
        .eq('user_id', user.id);

      if (userOutletsError) throw userOutletsError;

      setUserOutlets(userOutletsData || []);

      if (userOutletsData && userOutletsData.length > 0) {
        const outletIds = userOutletsData.map((uo) => uo.outlet_id);
        const { data: outletsData, error: outletsError } = await supabase
          .from('outlets')
          .select('*')
          .in('id', outletIds);

        if (outletsError) throw outletsError;
        setOutlets(outletsData || []);
      } else {
        setOutlets([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch outlets'));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchUserOutlets();
  }, [fetchUserOutlets]);

  // UPDATED: Use RPC function instead of separate inserts
  const createOutlet = async (name: string, type: string) => {
    if (!user) return { error: new Error('Not authenticated') };

    try {
      const { data, error: rpcError } = await supabase.rpc('create_outlet_with_assignment', {
        outlet_name: name,
        outlet_type: type,
      });

      if (rpcError) throw rpcError;

      // Refresh outlets list
      await fetchUserOutlets();

      return { data, error: null };
    } catch (err) {
      return { error: err instanceof Error ? err : new Error('Failed to create outlet') };
    }
  };

  return {
    userOutlets,
    outlets,
    loading,
    error,
    createOutlet,
    refetch: fetchUserOutlets,
  };
}
