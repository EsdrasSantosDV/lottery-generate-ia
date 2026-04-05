import { useEffect, useState, type ReactNode } from 'react';
import { getDatabase } from '@/db/database';

export function DatabaseProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    getDatabase()
      .then(() => {
        if (typeof navigator !== 'undefined' && navigator.storage?.persist) {
          void navigator.storage.persist();
        }
        setReady(true);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e : new Error(String(e))));
  }, []);

  if (error) {
    return (
      <div className="flex min-h-dvh items-center justify-center p-4">
        <p className="text-destructive text-center">Erro ao abrir o banco local: {error.message}</p>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <p className="text-sm text-muted-foreground">Carregando…</p>
      </div>
    );
  }

  return <>{children}</>;
}
