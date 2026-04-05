import { cn } from '@/lib/utils';
import type { WorkerState } from '@/lib/lottery-types';
import { Cpu } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface WorkerStatusGridProps {
  workers: WorkerState[];
}

const statusLabels: Record<string, string> = {
  idle: 'Aguardando',
  running: 'Processando',
  done: 'Concluído',
  error: 'Erro',
  cancelled: 'Interrompido',
};

const statusColors: Record<string, string> = {
  idle: 'bg-muted text-muted-foreground',
  running: 'bg-info/10 text-info border-info/30',
  done: 'bg-success/10 text-success border-success/30',
  error: 'bg-destructive/10 text-destructive border-destructive/30',
  cancelled: 'bg-muted text-muted-foreground border-border',
};

export function WorkerStatusGrid({ workers }: WorkerStatusGridProps) {
  if (workers.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {workers.map((w) => (
        <div
          key={w.id}
          className={cn(
            'rounded-lg border p-4 transition-all duration-300 animate-scale-in',
            statusColors[w.status]
          )}
        >
          <div className="flex items-center gap-2 mb-2">
            <Cpu className={cn('h-4 w-4', w.status === 'running' && 'animate-spin')} />
            <span className="text-sm font-semibold">Worker {w.id + 1}</span>
          </div>
          <div className="text-xs mb-2">{statusLabels[w.status]}</div>
          <Progress value={w.progress} className="h-1.5" />
          <div className="text-[10px] mt-1 opacity-70">
            {w.processed.toLocaleString('pt-BR')} / {w.total.toLocaleString('pt-BR')}
          </div>
        </div>
      ))}
    </div>
  );
}
