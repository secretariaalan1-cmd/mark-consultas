import { Patient, Appointment } from '@/types/scheduling';
import { getPatients, savePatients, getAppointments, getOpenDays, saveOpenDays, addOpenDay } from '@/lib/storage';

const CSV_SEP = ';';

function escapeCSV(val: string): string {
  if (val.includes(CSV_SEP) || val.includes('"') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { current += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { current += ch; }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === CSV_SEP) { result.push(current); current = ''; }
      else { current += ch; }
    }
  }
  result.push(current);
  return result;
}

export function exportBackup(): string {
  const patients = getPatients();
  const appointments = getAppointments();
  const openDays = getOpenDays();

  let csv = '### DIAS LIBERADOS ###\n';
  csv += openDays.join(CSV_SEP) + '\n';

  csv += '### PACIENTES ###\n';
  csv += ['id', 'name', 'susCard', 'dob', 'psf', 'observations'].map(escapeCSV).join(CSV_SEP) + '\n';
  for (const p of patients) {
    csv += [p.id, p.name, p.susCard, p.dob, p.psf, p.observations].map(escapeCSV).join(CSV_SEP) + '\n';
  }

  csv += '### AGENDAMENTOS ###\n';
  csv += ['slot', 'date', 'patientId', 'patientName', 'susCard', 'dob', 'psf', 'reason', 'type'].map(escapeCSV).join(CSV_SEP) + '\n';
  for (const a of appointments) {
    csv += [String(a.slot), a.date, a.patientId, a.patientName, a.susCard, a.dob, a.psf, a.reason, a.type].map(escapeCSV).join(CSV_SEP) + '\n';
  }

  return csv;
}

export function downloadBackup() {
  const csv = exportBackup();
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `medsched_backup_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importBackup(text: string): { patients: number; appointments: number } {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  
  let section = '';
  const patients: Patient[] = [];
  const appointments: Appointment[] = [];
  let headerSkipped = false;

  for (const line of lines) {
    if (line.startsWith('### PACIENTES ###')) { section = 'patients'; headerSkipped = false; continue; }
    if (line.startsWith('### AGENDAMENTOS ###')) { section = 'appointments'; headerSkipped = false; continue; }
    if (!headerSkipped) { headerSkipped = true; continue; }

    const cols = parseCSVLine(line);
    if (section === 'patients' && cols.length >= 6) {
      patients.push({ id: cols[0], name: cols[1], susCard: cols[2], dob: cols[3], psf: cols[4], observations: cols[5] });
    }
    if (section === 'appointments' && cols.length >= 9) {
      appointments.push({
        slot: Number(cols[0]), date: cols[1], patientId: cols[2], patientName: cols[3],
        susCard: cols[4], dob: cols[5], psf: cols[6], reason: cols[7], type: cols[8] as 'NORMAL' | 'RETORNO',
      });
    }
  }

  // Merge with existing
  const existing = getPatients();
  const patientMap = new Map(existing.map(p => [p.id, p]));
  for (const p of patients) patientMap.set(p.id, p);
  savePatients(Array.from(patientMap.values()));

  const existingAppts = getAppointments();
  const apptMap = new Map(existingAppts.map(a => [`${a.date}_${a.slot}`, a]));
  for (const a of appointments) apptMap.set(`${a.date}_${a.slot}`, a);
  localStorage.setItem('medsched_appointments', JSON.stringify(Array.from(apptMap.values())));

  return { patients: patients.length, appointments: appointments.length };
}
