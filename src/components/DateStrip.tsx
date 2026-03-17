import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  date: string;
  onChange: (date: string) => void;
  daysWithAppts?: Set<string>;
}

export function DateStrip({ date, onChange, daysWithAppts }: Props) {
  const current = new Date(date + 'T12:00:00');

  const getDays = () => {
    const days = [];
    for (let i = -3; i <= 3; i++) {
      const d = new Date(current);
      d.setDate(d.getDate() + i);
      days.push(d);
    }
    return days;
  };

  const navigate = (dir: number) => {
    const d = new Date(current);
    d.setDate(d.getDate() + dir);
    onChange(d.toISOString().split('T')[0]);
  };

  const formatDay = (d: Date) => {
    const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    return weekdays[d.getDay()];
  };

  const toISO = (d: Date) => d.toISOString().split('T')[0];

  return (
    <div className="flex items-center gap-1">
      <button onClick={() => navigate(-7)} className="p-1.5 rounded hover:bg-accent transition-colors text-muted-foreground">
        <ChevronLeft className="w-4 h-4" />
      </button>
      <div className="flex gap-1 overflow-x-auto">
        {getDays().map(d => {
          const iso = toISO(d);
          const isSelected = iso === date;
          const isToday = iso === new Date().toISOString().split('T')[0];
          const hasAppts = daysWithAppts?.has(iso);
          return (
            <button
              key={iso}
              onClick={() => onChange(iso)}
              className={`
                flex flex-col items-center px-2.5 py-1.5 rounded-md text-xs transition-colors min-w-[48px] relative
                ${isSelected
                  ? 'bg-primary text-primary-foreground'
                  : isToday
                    ? 'bg-accent text-foreground font-medium'
                    : 'hover:bg-accent text-muted-foreground'
                }
              `}
            >
              <span className="font-medium">{formatDay(d)}</span>
              <span className="text-lg font-semibold tabular-nums">{d.getDate()}</span>
              {hasAppts && (
                <span className={`w-1.5 h-1.5 rounded-full absolute bottom-0.5 ${isSelected ? 'bg-primary-foreground' : 'bg-primary'}`} />
              )}
            </button>
          );
        })}
      </div>
      <button onClick={() => navigate(7)} className="p-1.5 rounded hover:bg-accent transition-colors text-muted-foreground">
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
