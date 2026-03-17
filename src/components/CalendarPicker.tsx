import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';

interface Props {
  selectedDate: string | null;
  onChange: (date: string) => void;
  openDays: string[];
  daysWithAppts?: Set<string>;
  onDeleteDay?: (date: string) => void;
}

const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function toIso(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function CalendarPicker({ selectedDate, onChange, openDays, daysWithAppts, onDeleteDay }: Props) {
  const openSet = useMemo(() => new Set(openDays), [openDays]);

  const initialDate = useMemo(() => {
    if (selectedDate) {
      const [y, m] = selectedDate.split('-').map(Number);
      return { year: y, month: m - 1 };
    }
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  }, []);

  const [viewYear, setViewYear] = useState(initialDate.year);
  const [viewMonth, setViewMonth] = useState(initialDate.month);

  const today = new Date().toISOString().split('T')[0];

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(y => y - 1);
    } else {
      setViewMonth(m => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(y => y + 1);
    } else {
      setViewMonth(m => m + 1);
    }
  };

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  if (openDays.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-2">
        Nenhum dia liberado. Crie um dia de atendimento.
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm">
      {/* Month/year navigation */}
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={prevMonth}
          className="p-1.5 rounded hover:bg-accent transition-colors text-muted-foreground"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-semibold tracking-tight">
          {MONTH_NAMES[viewMonth]} {viewYear}
        </span>
        <button
          onClick={nextMonth}
          className="p-1.5 rounded hover:bg-accent transition-colors text-muted-foreground"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {WEEKDAY_LABELS.map(w => (
          <div key={w} className="text-[10px] font-medium text-muted-foreground text-center py-1">
            {w}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, idx) => {
          if (day === null) return <div key={`e-${idx}`} className="w-full aspect-square" />;

          const iso = toIso(viewYear, viewMonth, day);
          const isOpen = openSet.has(iso);
          const isSelected = iso === selectedDate;
          const isToday = iso === today;
          const hasAppts = daysWithAppts?.has(iso);

          return (
            <button
              key={iso}
              onClick={() => isOpen && onChange(iso)}
              disabled={!isOpen}
              className={`
                w-full aspect-square rounded-md flex flex-col items-center justify-center text-xs transition-all relative
                ${isSelected
                  ? 'bg-primary text-primary-foreground shadow-md scale-105'
                  : isOpen
                    ? 'bg-accent/60 text-foreground hover:bg-accent hover:scale-105 cursor-pointer font-medium'
                    : 'text-muted-foreground/30 cursor-default'
                }
                ${isToday && !isSelected ? 'ring-1 ring-primary/50' : ''}
              `}
            >
              <span className={`tabular-nums ${isSelected ? 'font-bold' : ''}`}>{day}</span>
              {hasAppts && (
                <span
                  className={`w-1 h-1 rounded-full mt-0.5 ${
                    isSelected ? 'bg-primary-foreground' : 'bg-primary'
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Delete selected day button */}
      {selectedDate && onDeleteDay && (
        <div className="flex justify-end mt-2">
          <button
            onClick={() => {
              if (confirm(`Remover o dia ${selectedDate} e todos os agendamentos?`)) {
                onDeleteDay(selectedDate);
              }
            }}
            className="flex items-center gap-1 px-2 py-1 text-xs rounded hover:bg-destructive/10 transition-colors text-destructive"
            title="Remover este dia"
          >
            <Trash2 className="w-3 h-3" />
            Remover dia
          </button>
        </div>
      )}
    </div>
  );
}
