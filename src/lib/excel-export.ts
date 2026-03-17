import * as XLSX from 'xlsx';
import { Appointment } from '@/types/scheduling';
import { getPatients, getAppointments, getOpenDays } from '@/lib/storage';

const WEEKDAYS = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

function formatDateBR(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function getWeekday(iso: string): string {
  const d = new Date(iso + 'T12:00:00');
  return WEEKDAYS[d.getDay()];
}

export function exportToExcel() {
  const openDays = getOpenDays().sort();
  const allAppointments = getAppointments();
  const patients = getPatients();
  
  const wb = XLSX.utils.book_new();

  // ── Sheet 1: Agenda por dia ──
  for (const day of openDays) {
    const dateBR = formatDateBR(day);
    const weekday = getWeekday(day);
    const dayAppts = allAppointments.filter(a => a.date === day).sort((a, b) => a.slot - b.slot);
    
    const sheetData: unknown[][] = [];
    
    // Header row with date info
    sheetData.push(['AGENDA DE ATENDIMENTO']);
    sheetData.push([`Data: ${dateBR} (${weekday})`]);
    sheetData.push([]);
    
    // Morning section
    sheetData.push(['MANHÃ — 08:00 — ZONA RURAL (Vagas 1–15)']);
    sheetData.push(['Nº', 'NOME', 'CARTÃO SUS', 'DATA NASCIMENTO', 'PSF', 'MOTIVO', 'TIPO']);
    
    for (let slot = 1; slot <= 15; slot++) {
      const appt = dayAppts.find(a => a.slot === slot);
      sheetData.push([
        slot,
        appt?.patientName || '',
        appt?.susCard || '',
        appt?.dob || '',
        appt?.psf || '',
        appt?.reason || '',
        appt?.type || '',
      ]);
    }
    
    sheetData.push([]);
    
    // Afternoon section
    sheetData.push(['TARDE — 14:00 — CIDADE / CAMOCIM (Vagas 16–30)']);
    sheetData.push(['Nº', 'NOME', 'CARTÃO SUS', 'DATA NASCIMENTO', 'PSF', 'MOTIVO', 'TIPO']);
    
    for (let slot = 16; slot <= 30; slot++) {
      const appt = dayAppts.find(a => a.slot === slot);
      sheetData.push([
        slot,
        appt?.patientName || '',
        appt?.susCard || '',
        appt?.dob || '',
        appt?.psf || '',
        appt?.reason || '',
        appt?.type || '',
      ]);
    }
    
    // Summary
    const totalManha = dayAppts.filter(a => a.slot <= 15).length;
    const totalTarde = dayAppts.filter(a => a.slot > 15).length;
    sheetData.push([]);
    sheetData.push(['RESUMO']);
    sheetData.push(['Pacientes Manhã:', totalManha, '', 'Vagas Livres Manhã:', 15 - totalManha]);
    sheetData.push(['Pacientes Tarde:', totalTarde, '', 'Vagas Livres Tarde:', 15 - totalTarde]);
    sheetData.push(['Total:', totalManha + totalTarde, '', 'Total Vagas Livres:', 30 - totalManha - totalTarde]);
    
    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    
    // Set column widths
    ws['!cols'] = [
      { wch: 5 },   // Nº
      { wch: 35 },  // Nome
      { wch: 20 },  // Cartão SUS
      { wch: 16 },  // Data Nascimento
      { wch: 15 },  // PSF
      { wch: 20 },  // Motivo
      { wch: 10 },  // Tipo
    ];
    
    // Merge header cells
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } }, // Title
      { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } }, // Date
      { s: { r: 3, c: 0 }, e: { r: 3, c: 6 } }, // Manhã header
      { s: { r: 20, c: 0 }, e: { r: 20, c: 6 } }, // Tarde header
    ];
    
    // Sheet name: use date format DD-MM
    const [, mm, dd] = day.split('-');
    const sheetName = `${dd}-${mm} ${weekday.substring(0, 3)}`;
    XLSX.utils.book_append_sheet(wb, ws, sheetName.substring(0, 31));
  }

  // ── Sheet: Resumo Geral ──
  const resumoData: unknown[][] = [];
  resumoData.push(['RESUMO GERAL DE ATENDIMENTOS']);
  resumoData.push([]);
  resumoData.push(['DATA', 'DIA DA SEMANA', 'MANHÃ', 'TARDE', 'TOTAL', 'VAGAS LIVRES']);
  
  let grandTotalManha = 0;
  let grandTotalTarde = 0;
  
  for (const day of openDays) {
    const dayAppts = allAppointments.filter(a => a.date === day);
    const manha = dayAppts.filter(a => a.slot <= 15).length;
    const tarde = dayAppts.filter(a => a.slot > 15).length;
    grandTotalManha += manha;
    grandTotalTarde += tarde;
    
    resumoData.push([
      formatDateBR(day),
      getWeekday(day),
      manha,
      tarde,
      manha + tarde,
      30 - manha - tarde,
    ]);
  }
  
  resumoData.push([]);
  resumoData.push(['TOTAL', '', grandTotalManha, grandTotalTarde, grandTotalManha + grandTotalTarde, (openDays.length * 30) - grandTotalManha - grandTotalTarde]);
  
  const wsResumo = XLSX.utils.aoa_to_sheet(resumoData);
  wsResumo['!cols'] = [
    { wch: 14 },
    { wch: 18 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 14 },
  ];
  wsResumo['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } },
  ];
  XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo Geral');

  // ── Sheet: Pacientes ──
  const pacientesData: unknown[][] = [];
  pacientesData.push(['CADASTRO DE PACIENTES']);
  pacientesData.push([]);
  pacientesData.push(['NOME', 'CARTÃO SUS', 'DATA NASCIMENTO', 'PSF', 'OBSERVAÇÕES']);
  
  const sortedPatients = [...patients].sort((a, b) => a.name.localeCompare(b.name));
  for (const p of sortedPatients) {
    pacientesData.push([p.name, p.susCard, p.dob, p.psf, p.observations]);
  }
  
  const wsPacientes = XLSX.utils.aoa_to_sheet(pacientesData);
  wsPacientes['!cols'] = [
    { wch: 35 },
    { wch: 20 },
    { wch: 16 },
    { wch: 15 },
    { wch: 30 },
  ];
  wsPacientes['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },
  ];
  XLSX.utils.book_append_sheet(wb, wsPacientes, 'Pacientes');

  // Generate and download
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const today = new Date().toISOString().split('T')[0];
  a.download = `agenda_medica_${today}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
