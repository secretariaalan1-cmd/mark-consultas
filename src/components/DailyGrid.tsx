import { Appointment, SLOTS_MANHA, SLOTS_TARDE, SLOTS_ABERTOS } from '@/types/scheduling';
import { SlotCard } from './SlotCard';

interface Props {
  appointments: Appointment[];
  onSlotClick: (slot: number) => void;
  onRemoveSlot: (slot: number) => void;
}

export function DailyGrid({ appointments, onSlotClick, onRemoveSlot }: Props) {
  const getAppt = (slot: number) => appointments.find(a => a.slot === slot);
  const isAberto = (slot: number) => SLOTS_ABERTOS.includes(slot);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
      {/* Manhã */}
      <div>
        <div className="flex items-center gap-2 mb-3 px-1">
          <div className="w-3 h-3 rounded-full bg-rural" />
          <h3 className="text-sm font-semibold tracking-tight">
            MANHÃ — 08:00 — ZONA RURAL
          </h3>
          <span className="text-xs text-muted-foreground ml-auto">15 vagas</span>
        </div>
        <div className="space-y-1.5">
          {SLOTS_MANHA.map(slot => (
            <SlotCard
              key={slot}
              slot={slot}
              appointment={getAppt(slot)}
              variant="rural"
              onClick={() => onSlotClick(slot)}
              onRemove={() => onRemoveSlot(slot)}
            />
          ))}
        </div>
      </div>

      {/* Tarde */}
      <div>
        <div className="flex items-center gap-2 mb-3 px-1">
          <div className="w-3 h-3 rounded-full bg-cidade" />
          <h3 className="text-sm font-semibold tracking-tight">
            TARDE — 14:00 — CIDADE / CAMOCIM
          </h3>
          <span className="text-xs text-muted-foreground ml-auto">17 vagas</span>
        </div>
        <div className="space-y-1.5">
          {SLOTS_TARDE.map(slot => (
            <SlotCard
              key={slot}
              slot={slot}
              appointment={getAppt(slot)}
              variant="cidade"
              isAberto={isAberto(slot)}
              onClick={() => onSlotClick(slot)}
              onRemove={() => onRemoveSlot(slot)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
