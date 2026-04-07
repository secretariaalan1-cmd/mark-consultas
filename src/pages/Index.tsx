import { useState, useRef } from 'react';
import { useScheduler } from '@/hooks/useScheduler';
import { useAuth } from '@/contexts/AuthContext';
import { DailyGrid } from '@/components/DailyGrid';
import { PatientDrawer } from '@/components/PatientDrawer';
import { PatientList } from '@/components/PatientList';
import { ExcelImport } from '@/components/ExcelImport';
import { CalendarPicker } from '@/components/CalendarPicker';
import { StatusBar } from '@/components/StatusBar';
import { InviteSection } from '@/components/InviteSection';
import { importExcel } from '@/lib/excel-import';
import { exportDayToExcel } from '@/lib/excel-export';
import { printTicket } from '@/lib/ticket-print';
import { FileSpreadsheet, RotateCcw, Calendar, Users, Copy, LogOut, Share2 } from 'lucide-react';
import { toast } from 'sonner';

type Tab = 'agenda' | 'pacientes' | 'convites';

export default function Index() {
  const scheduler = useScheduler();
  const { signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('agenda');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);

  const handleSlotClick = (slot: number) => {
    setSelectedSlot(slot);
    setDrawerOpen(true);
  };

  const handleImport = (buffer: ArrayBuffer) => {
    const result = importExcel(buffer);
    scheduler.refreshAll();
    toast.success(`${result.patientsImported} pacientes e ${result.appointments.length} consultas importados.`);
  };

  const handleExportDayExcel = () => {
    exportDayToExcel(scheduler.selectedDate, scheduler.appointments);
    toast.success('Agenda do dia exportada para Excel!');
  };

  const handleResetDay = () => {
    if (confirm('Limpar todos os agendamentos deste dia?')) {
      scheduler.resetDay();
      toast.success('Dia limpo com sucesso.');
    }
  };

  const handleDuplicateDay = () => {
    const from = prompt('Copiar agenda de qual data? (AAAA-MM-DD)');
    if (from && /^\d{4}-\d{2}-\d{2}$/.test(from)) {
      scheduler.copyDay(from);
      toast.success('Agenda duplicada com sucesso.');
    }
  };

  const handlePrintSlot = (slot: number) => {
    const appt = scheduler.appointments.find(a => a.slot === slot);
    if (appt) {
      printTicket(appt);
      scheduler.markAsPrinted(slot);
      toast.success('Boleto pronto para impressão!');
    }
  };

  const existingAppt = selectedSlot
    ? scheduler.appointments.find(a => a.slot === selectedSlot)
    : undefined;

  const formatDateDisplay = (d: string) => {
    const [y, m, day] = d.split('-');
    const weekdays = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const date = new Date(Number(y), Number(m) - 1, Number(day));
    return `${weekdays[date.getDay()]}, ${day} de ${months[Number(m) - 1]} de ${y}`;
  };

  if (scheduler.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Carregando agenda...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-12">
      <header className="bg-card border-b border-border sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-lg font-semibold tracking-tight">saúde da mulher</h1>
              <p className="text-xs text-muted-foreground">Agendamento de Consultas — Camocim</p>
            </div>
            <div className="flex items-center gap-2">
              <ExcelImport onImport={handleImport} />
              <button onClick={signOut} className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-md bg-card slot-shadow hover:slot-shadow-hover transition-all text-muted-foreground" title="Sair">
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sair</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1 mb-3">
            <button onClick={() => setActiveTab('agenda')} className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors ${activeTab === 'agenda' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent'}`}>
              <Calendar className="w-3.5 h-3.5" /> Agenda
            </button>
            <button onClick={() => setActiveTab('pacientes')} className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors ${activeTab === 'pacientes' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent'}`}>
              <Users className="w-3.5 h-3.5" /> Pacientes ({scheduler.patients.length})
            </button>
            <button onClick={() => setActiveTab('convites')} className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors ${activeTab === 'convites' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent'}`}>
              <Share2 className="w-3.5 h-3.5" /> Convites
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-4">
        {activeTab === 'agenda' && (
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="lg:w-72 shrink-0">
              <CalendarPicker
                selectedDate={scheduler.selectedDate}
                onChange={scheduler.changeDate}
                daysWithAppts={scheduler.daysWithAppts}
              />
              <div className="mt-3 flex gap-2">
                <button onClick={handleExportDayExcel} className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-md bg-emerald-600 text-white hover:bg-emerald-700 transition-colors font-medium flex-1" title="Exportar agenda do dia para Excel">
                  <FileSpreadsheet className="w-4 h-4" /> Excel
                </button>
                <button onClick={handleDuplicateDay} className="flex items-center gap-1.5 px-2.5 py-2 text-sm rounded-md bg-card slot-shadow hover:slot-shadow-hover transition-all text-muted-foreground" title="Duplicar agenda de outro dia">
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button onClick={handleResetDay} className="flex items-center gap-1.5 px-2.5 py-2 text-sm rounded-md bg-card slot-shadow hover:slot-shadow-hover transition-all text-destructive" title="Limpar dia">
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="flex-1">
              <div className="text-sm font-medium text-muted-foreground mb-4">
                {formatDateDisplay(scheduler.selectedDate)}
              </div>
              <DailyGrid
                appointments={scheduler.appointments}
                onSlotClick={handleSlotClick}
                onRemoveSlot={scheduler.cancelSlot}
                onPrintSlot={handlePrintSlot}
              />
            </div>
          </div>
        )}

        {activeTab === 'pacientes' && (
          <PatientList
            patients={scheduler.patients}
            onUpdate={scheduler.updatePatient}
            onDelete={scheduler.removePatient}
          />
        )}

        {activeTab === 'convites' && <InviteSection />}
      </main>

      <PatientDrawer
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setSelectedSlot(null); }}
        slot={selectedSlot}
        date={scheduler.selectedDate}
        existingAppt={existingAppt}
        onSave={scheduler.bookSlot}
        onSearch={scheduler.search}
        checkDuplicate={scheduler.checkDuplicate}
        getLastAppointment={scheduler.getLastAppointment}
      />

      <StatusBar
        total={scheduler.appointments.length}
        livresManha={scheduler.livresManha}
        livresTarde={scheduler.livresTarde}
      />
    </div>
  );
}
