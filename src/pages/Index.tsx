import { useState } from 'react';
import { useScheduler } from '@/hooks/useScheduler';
import { DailyGrid } from '@/components/DailyGrid';
import { PatientDrawer } from '@/components/PatientDrawer';
import { PatientList } from '@/components/PatientList';
import { ExcelImport } from '@/components/ExcelImport';
import { DateStrip } from '@/components/DateStrip';
import { StatusBar } from '@/components/StatusBar';
import { importExcel } from '@/lib/excel-import';
import { generatePDF } from '@/lib/pdf-generator';
import { FileText, RotateCcw, Calendar, Users, Copy } from 'lucide-react';
import { toast } from 'sonner';

type Tab = 'agenda' | 'pacientes';

export default function Index() {
  const scheduler = useScheduler();
  const [activeTab, setActiveTab] = useState<Tab>('agenda');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);

  const handleSlotClick = (slot: number) => {
    setSelectedSlot(slot);
    setDrawerOpen(true);
  };

  const handleImport = (buffer: ArrayBuffer) => {
    const result = importExcel(buffer);
    scheduler.refreshPatients();
    toast.success(`${result.patientsImported} pacientes importados. ${result.sheetsProcessed} abas processadas.`);
  };

  const handlePDF = () => {
    generatePDF(scheduler.selectedDate, scheduler.appointments);
  };

  const handleResetDay = () => {
    scheduler.resetDay();
    toast.success('Dia limpo com sucesso.');
  };

  const handleDuplicateDay = () => {
    const from = prompt('Copiar agenda de qual data? (AAAA-MM-DD)');
    if (from && /^\d{4}-\d{2}-\d{2}$/.test(from)) {
      scheduler.copyDay(from);
      toast.success('Agenda duplicada com sucesso.');
    }
  };

  const existingAppt = selectedSlot
    ? scheduler.appointments.find(a => a.slot === selectedSlot)
    : undefined;

  const formatDateDisplay = (d: string) => {
    const [y, m, day] = d.split('-');
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${day} ${months[parseInt(m) - 1]} ${y}`;
  };

  return (
    <div className="min-h-screen pb-12">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-lg font-semibold tracking-tight">MedSched</h1>
              <p className="text-xs text-muted-foreground">Agendamento de Consultas — Camocim</p>
            </div>
            <div className="flex items-center gap-2">
              <ExcelImport onImport={handleImport} />
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 mb-3">
            <button
              onClick={() => setActiveTab('agenda')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors ${
                activeTab === 'agenda'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" /> Agenda
            </button>
            <button
              onClick={() => setActiveTab('pacientes')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors ${
                activeTab === 'pacientes'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent'
              }`}
            >
              <Users className="w-3.5 h-3.5" /> Pacientes ({scheduler.patients.length})
            </button>
          </div>

          {activeTab === 'agenda' && (
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <DateStrip date={scheduler.selectedDate} onChange={scheduler.changeDate} />
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePDF}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium"
                >
                  <FileText className="w-4 h-4" /> Gerar PDF
                </button>
                <button
                  onClick={handleDuplicateDay}
                  className="flex items-center gap-1.5 px-2.5 py-2 text-sm rounded-md bg-card slot-shadow hover:slot-shadow-hover transition-all text-muted-foreground"
                  title="Duplicar agenda de outro dia"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleResetDay}
                  className="flex items-center gap-1.5 px-2.5 py-2 text-sm rounded-md bg-card slot-shadow hover:slot-shadow-hover transition-all text-destructive"
                  title="Limpar dia"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 py-4">
        {activeTab === 'agenda' && (
          <>
            <div className="text-sm font-medium text-muted-foreground mb-4">
              {formatDateDisplay(scheduler.selectedDate)}
            </div>
            <DailyGrid
              appointments={scheduler.appointments}
              onSlotClick={handleSlotClick}
              onRemoveSlot={scheduler.cancelSlot}
            />
          </>
        )}

        {activeTab === 'pacientes' && (
          <PatientList
            patients={scheduler.patients}
            onUpdate={scheduler.updatePatient}
            onDelete={scheduler.removePatient}
          />
        )}
      </main>

      {/* Drawer */}
      <PatientDrawer
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setSelectedSlot(null); }}
        slot={selectedSlot}
        date={scheduler.selectedDate}
        existingAppt={existingAppt}
        onSave={scheduler.bookSlot}
        onSearch={scheduler.search}
        checkDuplicate={scheduler.checkDuplicate}
      />

      {/* Status Bar */}
      <StatusBar
        total={scheduler.appointments.length}
        livresManha={scheduler.livresManha}
        livresTarde={scheduler.livresTarde}
      />
    </div>
  );
}
