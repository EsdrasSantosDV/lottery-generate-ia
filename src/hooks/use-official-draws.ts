import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase-client';
import {
  DRAW_LIST_PAGE,
  fetchHistoricalDezenasForMode,
  fetchRecentDrawsPage,
} from '@/lib/lottery-official-supabase';

export function useOfficialDraws(modeId: string) {
  const sb = getSupabaseClient();
  const enabled = isSupabaseConfigured() && sb != null && Boolean(modeId);

  return useInfiniteQuery({
    queryKey: ['official-draws', modeId],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      if (!sb) throw new Error('Supabase não configurado');
      return fetchRecentDrawsPage(sb, modeId, DRAW_LIST_PAGE, pageParam);
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < DRAW_LIST_PAGE) return undefined;
      return allPages.length * DRAW_LIST_PAGE;
    },
    enabled,
  });
}

/** Todos os sorteios (`dezenas`) da modalidade no Supabase — para análise contra histórico real. */
export function useHistoricalDezenasForMode(modeId: string, enabled: boolean) {
  const sb = getSupabaseClient();
  const ok = isSupabaseConfigured() && sb != null && Boolean(modeId) && enabled;

  return useQuery({
    queryKey: ['historical-dezenas', modeId],
    queryFn: async () => {
      if (!sb) throw new Error('Supabase não configurado');
      return fetchHistoricalDezenasForMode(sb, modeId);
    },
    enabled: ok,
  });
}
