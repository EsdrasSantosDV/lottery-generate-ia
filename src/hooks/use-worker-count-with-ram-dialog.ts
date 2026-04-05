import { useCallback, useState } from 'react';
import { HIGH_RAM_WORKER_THRESHOLD } from '@/lib/worker-limits';

/**
 * Controlo do número de workers com modal ao passar acima de {@link HIGH_RAM_WORKER_THRESHOLD}
 * (cada worker tem heap isolado; muitos em paralelo consomem muita RAM).
 */
export function useWorkerCountWithRamDialog(initialCount = 4) {
  const [workerCount, setWorkerCount] = useState(initialCount);
  const [ramDialogOpen, setRamDialogOpen] = useState(false);
  const [pendingWorkerCount, setPendingWorkerCount] = useState(initialCount);

  const onWorkerSliderChange = useCallback(
    (value: number[]) => {
      const next = value[0]!;
      if (next > HIGH_RAM_WORKER_THRESHOLD && workerCount <= HIGH_RAM_WORKER_THRESHOLD) {
        setPendingWorkerCount(next);
        setRamDialogOpen(true);
        return;
      }
      setWorkerCount(next);
    },
    [workerCount]
  );

  const confirmHighWorkerCount = useCallback(() => {
    setWorkerCount(pendingWorkerCount);
    setRamDialogOpen(false);
  }, [pendingWorkerCount]);

  const dismissRamDialog = useCallback(() => {
    setRamDialogOpen(false);
  }, []);

  return {
    workerCount,
    setWorkerCount,
    ramDialogOpen,
    pendingWorkerCount,
    onWorkerSliderChange,
    confirmHighWorkerCount,
    dismissRamDialog,
  };
}
