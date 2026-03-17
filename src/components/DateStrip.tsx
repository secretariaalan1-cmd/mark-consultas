import { ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';

interface Props {
  selectedDate: string | null;
  onChange: (date: string) => void;
  openDays: string[];
  daysWithAppts?: Set<string>;
  onDeleteDay?: (date: string) => void;
}

export function DateStrip({ selectedDate, onChange, openDays, daysWithAppts, onDeleteDay }: Props) {
  const sorted = [...openDays].sort();
  const currentIdx = selectedDate ? sorted.indexOf(selectedDate) : -1;

  const navigate = (dir: number) => {
    const newIdx = currentIdx + dir;
    if (newIdx >= 0 && newIdx < sorted.length) {
      onChange(sorted[newIdx]);
    }
  };

  const formatDay = (iso: string) => {
    const d = new Date(iso + 'T12:00:00');
    const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return {
      weekday: weekdays[d.getDay()],
      day: d.getDate(),
      month: months[d.getMonth()],
    };
  };

  if (sorted.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-2">
        Nenhum dia liberado. Crie um dia de atendimento.
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => navigate(-1)}
        disabled={currentIdx <= 0}
        className="p-1.5 rounded hover:bg-accent transition-colors text-muted-foreground disabled:opacity-30"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <div className="flex gap-1 overflow-x-auto">
        {sorted.map(iso => {
          const { weekday, day, month } = formatDay(iso);
          const isSelected = iso === selectedDate;
          const hasAppts = daysWithAppts?.has(iso);
          return (
            <button
              key={iso}
              onClick={() => onChange(iso)}
              className={`
                flex flex-col items-center px-2.5 py-1.5 rounded-md text-xs transition-colors min-w-[52px] relative
                ${isSelected
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-accent text-muted-foreground'
                }
              `}
            >
              <span className="font-medium">{weekday}</span>
              <span className="text-lg font-semibold tabular-nums">{day}</span>
              <span className="text-[10px] opacity-70">{month}</span>
              {hasAppts && (
                <span className={`w-1.5 h-1.5 rounded-full absolute bottom-0.5 ${isSelected ? 'bg-primary-foreground' : 'bg-primary'}`} />
              )}
            </button>
          );
        })}
      </div>
      <button
        onClick={() => navigate(1)}
        disabled={currentIdx >= sorted.length - 1}
        className="p-1.5 rounded hover:bg-accent transition-colors text-muted-foreground disabled:opacity-30"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
      {selectedDate && onDeleteDay && (
        <button
          onClick={() => {
            if (confirm(`Remover o dia ${selectedDate} e todos os agendamentos?`)) {
              onDeleteDay(selectedDate);
            }
          }}
          className="p-1.5 rounded hover:bg-destructive/10 transition-colors text-destructive ml-1"
          title="Remover este dia"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
