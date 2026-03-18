import { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  selectedDate: string | null;
  onChange: (date: string) => void;
  daysWithAppts?: Set<string>;
}

const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function toIso(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function CalendarPicker({ selectedDate, onChange, daysWithAppts }: Props) {
  const [viewYear, setViewYear] = useState(() => {
    if (selectedDate) return Number(selectedDate.split('-')[0]);
    return new Date().getFullYear();
  });
  const [viewMonth, setViewMonth] = useState(() => {
    if (selectedDate) return Number(selectedDate.split('-')[1]) - 1;
    return new Date().getMonth();
  });

  // Sync view when selectedDate changes from outside (e.g. from Index)
  useEffect(() => {
    if (selectedDate) {
      const [y, m] = selectedDate.split('-').map(Number);
      const selMonth = m - 1;
      if (y !== viewYear || selMonth !== viewMonth) {
        setViewYear(y);
        setViewMonth(selMonth);
      }
    }
  }, [selectedDate]);

  const today = new Date().toISOString().split('T')[0];
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();

  const prevMonth = () => {
    let year = viewYear;
    let month = viewMonth;
    if (viewMonth === 0) { month = 11; year -= 1; }
    else month -= 1;
    setViewMonth(month);
    setViewYear(year);
    onChange(toIso(year, month, 1));
  };

  const nextMonth = () => {
    let year = viewYear;
    let month = viewMonth;
    if (viewMonth === 11) { month = 0; year += 1; }
    else month += 1;
    setViewMonth(month);
    setViewYear(year);
    onChange(toIso(year, month, 1));
  };

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="w-full max-w-sm">
      <div className="flex items-center justify-between mb-2">
        <button onClick={prevMonth} className="p-1.5 rounded hover:bg-accent transition-colors text-muted-foreground">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-semibold tracking-tight">
          {MONTH_NAMES[viewMonth]} {viewYear}
        </span>
        <button onClick={nextMonth} className="p-1.5 rounded hover:bg-accent transition-colors text-muted-foreground">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {WEEKDAY_LABELS.map(w => (
          <div key={w} className="text-[10px] font-medium text-muted-foreground text-center py-1">{w}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, idx) => {
          if (day === null) return <div key={`e-${idx}`} className="w-full aspect-square" />;

          const iso = toIso(viewYear, viewMonth, day);
          const isSelected = iso === selectedDate;
          const isToday = iso === today;
          const hasAppts = daysWithAppts?.has(iso);

          return (
            <button
              key={iso}
              onClick={() => onChange(iso)}
              className={`
                w-full aspect-square rounded-md flex flex-col items-center justify-center text-xs transition-all relative cursor-pointer
                ${isSelected
                  ? 'bg-primary text-primary-foreground shadow-md scale-105 font-bold'
                  : hasAppts
                    ? 'bg-accent/60 text-foreground hover:bg-accent hover:scale-105 font-medium'
                    : 'text-muted-foreground hover:bg-accent/40 hover:scale-105'
                }
                ${isToday && !isSelected ? 'ring-1 ring-primary/50' : ''}
              `}
            >
              <span className="tabular-nums">{day}</span>
              {hasAppts && (
                <span className={`w-1.5 h-1.5 rounded-full mt-0.5 ${isSelected ? 'bg-primary-foreground' : 'bg-primary'}`} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
