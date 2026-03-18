import { Appointment } from '@/types/scheduling';
import { X } from 'lucide-react';

interface Props {
  slot: number;
  appointment?: Appointment;
  variant: 'rural' | 'cidade';
  isAberto?: boolean;
  onClick: () => void;
  onRemove: () => void;
}

export function SlotCard({ slot, appointment, variant, onClick, onRemove }: Props) {
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
        <span className="text-xs text-muted-foreground italic">Livre</span>
      ) : (
        <div className="flex-1 min-w-0 ml-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium truncate">{appointment.patientName}</span>
            {appointment.type === 'RETORNO' && (
              <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded bg-retorno text-retorno-foreground">
                RETORNO
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
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="opacity-0 group-hover:opacity-100 transition-opacity ml-2 p-1 rounded hover:bg-destructive/10 text-destructive"
          title="Remover"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
