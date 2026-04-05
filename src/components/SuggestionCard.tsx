import { cn } from '@/lib/utils';
import { NumberBadge } from './NumberBadge';
import { Copy, Check } from 'lucide-react';
import { useState } from 'react';

interface SuggestionCardProps {
  title: string;
  description: string;
  numbers: number[];
  variant?: 'primary' | 'accent' | 'muted' | 'default';
  /** Formata cada dezena para cópia e exibição (ex.: Super Sete = um dígito). */
  formatDigit?: (n: number) => string;
}

export function SuggestionCard({ title, description, numbers, variant = 'default', formatDigit }: SuggestionCardProps) {
  const [copied, setCopied] = useState(false);

  const fmt = formatDigit ?? ((n: number) => String(n).padStart(2, '0'));

  const handleCopy = () => {
    navigator.clipboard.writeText(numbers.map((n) => fmt(n)).join(' - '));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={cn(
        'rounded-lg border p-5 transition-all duration-200 hover:shadow-elevated animate-fade-in',
        'bg-card'
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-semibold text-foreground">{title}</h4>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
        <button
          onClick={handleCopy}
          className="p-2 rounded-md bg-muted hover:bg-muted/80 transition-colors"
          title="Copiar"
        >
          {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {numbers.map((n, i) => (
          <NumberBadge
            key={i}
            number={n}
            displayValue={fmt(n)}
            highlight={variant === 'primary' ? 'top' : variant === 'muted' ? 'bottom' : 'none'}
            size="sm"
          />
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground mt-3 italic">
        ⚠ Sugestão baseada na distribuição simulada. Não constitui garantia de resultado.
      </p>
    </div>
  );
}
