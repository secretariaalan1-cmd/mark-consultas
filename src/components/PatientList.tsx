import { useState } from 'react';
import { Patient } from '@/types/scheduling';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Pencil, Trash2, Save, X } from 'lucide-react';

interface Props {
  patients: Patient[];
  onUpdate: (p: Patient) => void;
  onDelete: (id: string) => void;
}

export function PatientList({ patients, onUpdate, onDelete }: Props) {
  const [query, setQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Patient | null>(null);

  const filtered = query.length >= 2
    ? patients.filter(p =>
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.susCard.includes(query)
      )
    : patients;

  const startEdit = (p: Patient) => {
    setEditingId(p.id);
    setEditForm({ ...p });
  };

  const saveEdit = () => {
    if (editForm) {
      onUpdate(editForm);
      setEditingId(null);
      setEditForm(null);
    }
  };

  return (
    <div>
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar paciente por nome ou SUS..."
          className="pl-9"
        />
      </div>

      <div className="text-xs text-muted-foreground mb-2 px-1">
        {filtered.length} paciente{filtered.length !== 1 ? 's' : ''}
      </div>

      <div className="space-y-1">
        {filtered.slice(0, 100).map(p => (
          <div key={p.id} className="bg-card rounded-md slot-shadow px-3 py-2.5">
            {editingId === p.id && editForm ? (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    placeholder="Nome"
                    className="text-sm"
                  />
                  <Input
                    value={editForm.susCard}
                    onChange={(e) => setEditForm({ ...editForm, susCard: e.target.value })}
                    placeholder="Cartão SUS"
                    className="text-sm font-mono"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Input
                    value={editForm.dob}
                    onChange={(e) => setEditForm({ ...editForm, dob: e.target.value })}
                    placeholder="Nascimento"
                    className="text-sm"
                  />
                  <Input
                    value={editForm.psf}
                    onChange={(e) => setEditForm({ ...editForm, psf: e.target.value })}
                    placeholder="PSF"
                    className="text-sm"
                  />
                  <Input
                    value={editForm.observations}
                    onChange={(e) => setEditForm({ ...editForm, observations: e.target.value })}
                    placeholder="Observações"
                    className="text-sm"
                  />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={saveEdit}><Save className="w-3.5 h-3.5 mr-1" />Salvar</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}><X className="w-3.5 h-3.5" /></Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{p.name}</div>
                  <div className="flex items-center gap-3 mt-0.5">
                    {p.susCard && <span className="text-[11px] font-mono tabular-nums text-muted-foreground">SUS: {p.susCard}</span>}
                    {p.dob && <span className="text-[11px] text-muted-foreground">{p.dob}</span>}
                    {p.psf && <span className="text-[11px] text-muted-foreground">{p.psf}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <button onClick={() => startEdit(p)} className="p-1.5 rounded hover:bg-accent transition-colors text-muted-foreground">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => onDelete(p.id)} className="p-1.5 rounded hover:bg-destructive/10 transition-colors text-destructive">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
