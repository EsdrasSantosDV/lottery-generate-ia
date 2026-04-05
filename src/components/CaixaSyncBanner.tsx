import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { CaixaSyncUiStatus } from '@/hooks/use-caixa-sync';

type Props = {
  status: CaixaSyncUiStatus;
  progressLabel: string;
  errorMessage: string | null;
};

export function CaixaSyncBanner({ status, progressLabel, errorMessage }: Props) {
  if (status === 'idle') return null;

  if (status === 'done' && errorMessage) {
    return (
      <Alert className="mb-4 border-amber-500/50 bg-amber-500/5 text-foreground">
        <AlertTitle>Sincronização local concluída</AlertTitle>
        <AlertDescription className="text-muted-foreground">{errorMessage}</AlertDescription>
      </Alert>
    );
  }

  if (status === 'done') return null;

  if (status === 'error') {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertTitle>Não foi possível sincronizar os resultados da Caixa</AlertTitle>
        <AlertDescription>{errorMessage ?? 'Erro desconhecido.'}</AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert className="mb-4 border-muted">
      <Loader2 className="h-4 w-4 animate-spin" />
      <AlertTitle>
        {status === 'checking' ? 'Verificando histórico local…' : 'Sincronizando resultados oficiais…'}
      </AlertTitle>
      {progressLabel ? <AlertDescription className="font-mono text-xs">{progressLabel}</AlertDescription> : null}
    </Alert>
  );
}
