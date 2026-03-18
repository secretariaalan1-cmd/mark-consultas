interface Props {
  total: number;
  livresManha: number;
  livresTarde: number;
}

export function StatusBar({ total, livresManha, livresTarde }: Props) {
  const ocupadas = 32 - livresManha - livresTarde;
  const livresTotal = livresManha + livresTarde;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border px-4 py-2 flex items-center justify-between text-xs z-50">
      <div className="flex items-center gap-4">
        <span className="font-semibold tabular-nums">
          {ocupadas}/32 Vagas Ocupadas
        </span>
        {livresTotal > 0 && (
          <span className="text-muted-foreground">
            {livresTotal} Livres: {livresManha} Manhã, {livresTarde} Tarde
          </span>
        )}
      </div>
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-rural" /> Rural
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-cidade" /> Cidade
        </span>
      </div>
    </div>
  );
}
