import { Appointment } from '@/types/scheduling';
import { X, Printer, CheckCircle2, Clock } from 'lucide-react';

interface Props {
  slot: number;
  appointment?: Appointment;
  variant: 'rural' | 'cidade';
  isAberto?: boolean;
  onClick: () => void;
  onRemove: () => void;
  onPrint?: () => void;
}

export function SlotCard({ slot, appointment, variant, isAberto, onClick, onRemove, onPrint }: Props) {
  const isEmpty = !appointment;
  const accentClass = variant === 'rural' ? 'border-l-rural' : 'border-l-cidade';

  return (
    <div
      onClick={onClick}
      className={`
        group relative flex items-center min-h-[52px] px-3 py-2 rounded-md cursor-pointer
        transition-all duration-150 border-l-[3px]
        ${isEmpty
          ? `bg-card slot-shadow border-l-border hover:slot-shadow-hover hover:translate-x-0.5`
          : `bg-card slot-shadow ${accentClass} hover:slot-shadow-hover hover:translate-x-0.5`
        }
      `}
    >
      <span className={`text-xs font-semibold tabular-nums w-7 shrink-0 ${isEmpty ? 'text-muted-foreground' : 'text-foreground'}`}>
        {String(slot).padStart(2, '0')}
      </span>

      {isEmpty ? (
        <span className="text-xs text-muted-foreground italic">
          {isAberto ? 'Aberta' : 'Livre'}
        </span>
      ) : (
        <div className="flex-1 min-w-0 ml-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium truncate">{appointment.patientName}</span>
            {appointment.time && (
              <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground font-medium">
                <Clock className="w-3 h-3" />
                {appointment.time}
              </span>
            )}
            {appointment.type === 'RETORNO' && (
              <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded bg-retorno text-retorno-foreground">
                RETORNO
              </span>
            )}
            {appointment.printed && (
              <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-semibold px-1 rounded bg-emerald-50 border border-emerald-100">
                <CheckCircle2 className="w-3 h-3" /> Impresso
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            {appointment.susCard && (
              <span className="text-[11px] font-mono tabular-nums text-muted-foreground">{appointment.susCard}</span>
            )}
            {appointment.psf && (
              <span className="text-[11px] text-muted-foreground">{appointment.psf}</span>
            )}
          </div>
        </div>
      )}

      {!isEmpty && (
        <div className="flex items-center gap-1 ml-auto shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          {onPrint && (
            <button
              onClick={(e) => { e.stopPropagation(); onPrint(); }}
              className="p-1.5 rounded hover:bg-primary/10 text-primary"
              title="Imprimir boleto"
            >
              <Printer className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="p-1.5 rounded hover:bg-destructive/10 text-destructive"
            title="Remover"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
