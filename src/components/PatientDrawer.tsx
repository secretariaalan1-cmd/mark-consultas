import { useState, useEffect } from 'react';
import { Appointment, Patient } from '@/types/scheduling';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  slot: number | null;
  date: string;
  existingAppt?: Appointment;
  onSave: (appt: Appointment) => void;
  onSearch: (q: string) => Patient[];
  checkDuplicate: (patientId: string, excludeSlot?: number) => boolean;
}

function genId() {
  return Math.random().toString(36).substring(2, 15);
}

export function PatientDrawer({ open, onClose, slot, date, existingAppt, onSave, onSearch, checkDuplicate }: Props) {
  const [name, setName] = useState('');
  const [susCard, setSusCard] = useState('');
  const [dob, setDob] = useState('');
  const [psf, setPsf] = useState('');
  const [reason, setReason] = useState('');
  const [type, setType] = useState<'NORMAL' | 'RETORNO'>('NORMAL');
  const [patientId, setPatientId] = useState('');
  const [suggestions, setSuggestions] = useState<Patient[]>([]);
  const [duplicateWarning, setDuplicateWarning] = useState(false);

  useEffect(() => {
    if (existingAppt) {
      setName(existingAppt.patientName);
      setSusCard(existingAppt.susCard);
      setDob(existingAppt.dob);
      setPsf(existingAppt.psf);
      setReason(existingAppt.reason);
      setType(existingAppt.type);
      setPatientId(existingAppt.patientId);
    } else {
      setName(''); setSusCard(''); setDob(''); setPsf('');
      setReason(''); setType('NORMAL'); setPatientId(genId());
    }
    setSuggestions([]);
    setDuplicateWarning(false);
  }, [existingAppt, open]);

  const handleNameChange = (val: string) => {
    setName(val);
    if (val.length >= 2) {
      setSuggestions(onSearch(val));
    } else {
      setSuggestions([]);
    }
  };

  const selectPatient = (p: Patient) => {
    setName(p.name);
    setSusCard(p.susCard);
    setDob(p.dob);
    setPsf(p.psf);
    setPatientId(p.id);
    setSuggestions([]);
    if (checkDuplicate(p.id, slot ?? undefined)) {
      setDuplicateWarning(true);
    } else {
      setDuplicateWarning(false);
    }
  };

  const handleSave = () => {
    if (!name.trim() || slot === null) return;
    const id = patientId || genId();
    if (checkDuplicate(id, slot)) {
      setDuplicateWarning(true);
      return;
    }
    onSave({
      slot,
      date,
      patientId: id,
      patientName: name.trim().toUpperCase(),
      susCard: susCard.trim(),
      dob: dob.trim(),
      psf: psf.trim().toUpperCase(),
      reason: reason.trim(),
      type,
    });
    onClose();
  };

  if (slot === null) return null;

  const shiftLabel = slot <= 15 ? 'Manhã — Zona Rural' : 'Tarde — Cidade';

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">
            Vaga {String(slot).padStart(2, '0')} — {shiftLabel}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 mt-2">
          {duplicateWarning && (
            <div className="flex items-center gap-2 p-2.5 rounded-md bg-destructive/10 text-destructive text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              Paciente já agendado para este dia.
            </div>
          )}

          <div className="relative">
            <Label className="text-xs font-medium text-muted-foreground">Nome</Label>
            <Input
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Digite o nome do paciente"
              className="mt-1"
              autoFocus
            />
            {suggestions.length > 0 && (
              <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-card rounded-md slot-shadow border border-border max-h-48 overflow-y-auto">
                {suggestions.map(p => (
                  <button
                    key={p.id}
                    onClick={() => selectPatient(p)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
                  >
                    <div className="font-medium">{p.name}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {p.susCard && `SUS: ${p.susCard}`} {p.psf && `· ${p.psf}`}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-medium text-muted-foreground">Cartão SUS</Label>
              <Input value={susCard} onChange={(e) => setSusCard(e.target.value)} className="mt-1 font-mono text-sm" />
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground">Data de Nascimento</Label>
              <Input value={dob} onChange={(e) => setDob(e.target.value)} placeholder="DD/MM/AAAA" className="mt-1" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-medium text-muted-foreground">PSF</Label>
              <Input value={psf} onChange={(e) => setPsf(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground">Motivo</Label>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} className="mt-1" />
            </div>
          </div>

          <div>
            <Label className="text-xs font-medium text-muted-foreground">Tipo</Label>
            <div className="flex gap-2 mt-1.5">
              <button
                onClick={() => setType('NORMAL')}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  type === 'NORMAL'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-accent'
                }`}
              >
                NORMAL
              </button>
              <button
                onClick={() => setType('RETORNO')}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  type === 'RETORNO'
                    ? 'bg-retorno text-retorno-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-accent'
                }`}
              >
                RETORNO
              </button>
            </div>
          </div>

          <Button onClick={handleSave} className="w-full mt-2" disabled={!name.trim() || duplicateWarning}>
            {existingAppt ? 'Atualizar' : 'Agendar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
