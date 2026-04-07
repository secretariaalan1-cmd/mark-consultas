import * as XLSX from 'xlsx';
import { Appointment } from '@/types/scheduling';

const WEEKDAYS = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

function formatDateBR(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function getWeekday(iso: string): string {
  const d = new Date(iso + 'T12:00:00');
  return WEEKDAYS[d.getDay()];
}

export function exportDayToExcel(date: string, appointments: Appointment[]) {
  const dateBR = formatDateBR(date);
  const weekday = getWeekday(date);
  const dayAppts = appointments.sort((a, b) => a.slot - b.slot);
  
  const wb = XLSX.utils.book_new();
  const sheetData: unknown[][] = [];
  
  sheetData.push(['AGENDA DE ATENDIMENTO']);
  sheetData.push([`Data: ${dateBR} (${weekday})`]);
  sheetData.push([]);
  
  sheetData.push(['MANHÃ — 08:00 — ZONA RURAL (Vagas 1–15)']);
  sheetData.push(['Nº', 'HORÁRIO', 'NOME', 'CARTÃO SUS', 'DATA NASCIMENTO', 'PSF', 'MOTIVO', 'TIPO', 'ASSINATURA']);
  
  for (let slot = 1; slot <= 15; slot++) {
    const appt = dayAppts.find(a => a.slot === slot);
    sheetData.push([
      slot,
      appt?.time || '',
      appt?.patientName || '',
      appt?.susCard || '',
      appt?.dob || '',
      appt?.psf || '',
      appt?.reason || '',
      appt?.type || '',
      '',
    ]);
  }
  
  sheetData.push([]);
  
  sheetData.push(['TARDE — 14:00 — CIDADE / CAMOCIM (Vagas 16–32)']);
  sheetData.push(['Nº', 'HORÁRIO', 'NOME', 'CARTÃO SUS', 'DATA NASCIMENTO', 'PSF', 'MOTIVO', 'TIPO', 'ASSINATURA']);
  
  for (let slot = 16; slot <= 32; slot++) {
    const appt = dayAppts.find(a => a.slot === slot);
    const yellowMarker = slot >= 30 ? '🟡 ' : '';
    sheetData.push([
      `${yellowMarker}${slot}`,
      appt?.time || '',
      appt?.patientName || '',
      appt?.susCard || '',
      appt?.dob || '',
      appt?.psf || '',
      appt?.reason || '',
      appt?.type || '',
      '',
    ]);
  }
  
  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  ws['!cols'] = [
    { wch: 8 }, { wch: 8 }, { wch: 35 }, { wch: 20 }, { wch: 16 }, { wch: 15 }, { wch: 20 }, { wch: 10 }, { wch: 20 },
  ];
  
  const [, mm, dd] = date.split('-');
  const sheetName = `${dd}-${mm} ${weekday.substring(0, 3)}`;
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `agenda_${date}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
