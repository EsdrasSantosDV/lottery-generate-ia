import { useMemo } from 'react';
import type { LotteryMode } from '@/lib/lottery-types';
import { runGiaAnalysis, type GiaAnalysisResult } from '@/lib/gia-engine';
import { useHistoricalDrawsForGia } from '@/hooks/use-official-draws';

export function useGiaAnalysis(mode: LotteryMode, game: number[] | null) {
  const giaEnabled = mode.gameKind !== 'positional';
  const { data: rows, isLoading, isError, error } = useHistoricalDrawsForGia(mode.id, giaEnabled);

  const result: GiaAnalysisResult | null = useMemo(() => {
    if (!giaEnabled || !game || !rows?.length) return null;
    return runGiaAnalysis(mode, game, rows);
  }, [mode, game, rows, giaEnabled]);

  return {
    result,
    rows,
    isLoading,
    isError,
    error: error instanceof Error ? error : null,
    hasHistoricalData: (rows?.length ?? 0) > 0,
  };
}
