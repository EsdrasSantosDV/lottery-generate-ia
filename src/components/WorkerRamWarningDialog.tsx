import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { HIGH_RAM_WORKER_THRESHOLD } from '@/lib/worker-limits';

type WorkerRamWarningDialogProps = {
  open: boolean;
  pendingCount: number;
  onConfirm: () => void;
  onDismiss: () => void;
};

export function WorkerRamWarningDialog({
  open,
  pendingCount,
  onConfirm,
  onDismiss,
}: WorkerRamWarningDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onDismiss()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Muitos Web Workers</DialogTitle>
          <DialogDescription className="text-left space-y-2">
            <span className="block">
              Cada worker paralelo usa um heap de memória separado no navegador. Valores acima de{' '}
              {HIGH_RAM_WORKER_THRESHOLD} podem consumir <strong>muita RAM</strong> e provocar lentidão ou
              erros (por exemplo &quot;out of memory&quot;), sobretudo com muitos candidatos ou jogos.
            </span>
            <span className="block font-medium text-foreground">
              Pretende usar <span className="text-primary">{pendingCount}</span> workers?
            </span>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={onDismiss}>
            Cancelar
          </Button>
          <Button type="button" className="gradient-primary text-primary-foreground" onClick={onConfirm}>
            Continuar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
