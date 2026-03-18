import * as XLSX from 'xlsx';
import { Patient, Appointment } from '@/types/scheduling';
import { getPatients, savePatients, getAppointments, addOpenDay } from '@/lib/storage';

function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

function normalizeDate(val: unknown): string {
  if (!val) return '';
  if (typeof val === 'number') {
    const d = XLSX.SSF.parse_date_code(val);
    if (d) return `${String(d.d).padStart(2,'0')}/${String(d.m).padStart(2,'0')}/${d.y}`;
  }
  const s = String(val).trim();
  const parts = s.split(/[\/\-\.]/);
  if (parts.length === 3) {
    let [a, b, c] = parts.map(Number);
    if (a > 12) return `${String(a).padStart(2,'0')}/${String(b).padStart(2,'0')}/${c < 100 ? 2000 + c : c}`;
    if (b > 12) return `${String(b).padStart(2,'0')}/${String(a).padStart(2,'0')}/${c < 100 ? 2000 + c : c}`;
    return `${String(a).padStart(2,'0')}/${String(b).padStart(2,'0')}/${c < 100 ? 2000 + c : c}`;
  }
  return s;
}

function normalizeName(name: string): string {
  return name.trim().toUpperCase()
    .replace(/\s+/g, ' ')
    .replace(/[.]/g, '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function extractDateFromContent(rows: unknown[][]): string | null {
  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    for (const cell of rows[i]) {
      const s = String(cell || '');
      // Match "DATA: DD/MM/YYYY" or "DATA: DD/MM/YY"
      const match = s.match(/DATA[:\s]*(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/i);
      if (match) {
        const day = match[1].padStart(2, '0');
        const month = match[2].padStart(2, '0');
        const year = match[3].length === 2 ? '20' + match[3] : match[3];
        return `${year}-${month}-${day}`;
      }
    }
  }
  return null;
}

function extractShiftFromContent(rows: unknown[][]): 'manha' | 'tarde' | 'ambos' {
  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    for (const cell of rows[i]) {
      const s = String(cell || '').toLowerCase();
      if (s.includes('horário') || s.includes('horario')) {
        // Check if contains both morning and afternoon
        const hasMorning = /07[:h]|7[:h]30/i.test(s);
        const hasAfternoon = /13[:h]|14[:h]/i.test(s);
        if (hasMorning && hasAfternoon) return 'ambos';
        if (hasAfternoon) return 'tarde';
        if (hasMorning) return 'manha';
      }
    }
  }
  return 'manha';
}

function isAfternoonTime(val: unknown): boolean {
  const s = String(val || '').trim();
  const hourMatch = s.match(/^(\d{1,2})[:\.]?/);
  if (hourMatch) {
    const hour = Number(hourMatch[1]);
    return hour >= 12;
  }
  return false;
}

function extractDateFromSheetName(name: string): string | null {
  const match = name.match(/(\d{1,2})[\/\-\.](\d{1,2})(?:[\/\-\.](\d{2,4}))?/);
  if (match) {
    const day = match[1].padStart(2, '0');
    const month = match[2].padStart(2, '0');
    const year = match[3] ? (match[3].length === 2 ? '20' + match[3] : match[3]) : new Date().getFullYear().toString();
    return `${year}-${month}-${day}`;
  }
  return null;
}

export interface ImportResult {
  patients: Patient[];
  appointments: Appointment[];
  sheetsProcessed: number;
  patientsImported: number;
}

export function importExcel(file: ArrayBuffer): ImportResult {
  const wb = XLSX.read(file, { type: 'array' });
  const existingPatients = getPatients();
  const patientMap = new Map<string, Patient>();

  // Index existing patients by normalized name
  existingPatients.forEach(p => {
    const nameKey = normalizeName(p.name);
    patientMap.set(nameKey, p);
    if (p.susCard) patientMap.set(`sus:${p.susCard}`, p);
  });

  // Collect appointments per date to handle merging
  const dateAppointments = new Map<string, Appointment[]>();
  let sheetsProcessed = 0;

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    if (rows.length < 3) continue;

    // Extract date from content first, fall back to sheet name
    const date = extractDateFromContent(rows) || extractDateFromSheetName(sheetName);
    if (!date) continue;
    
    const shift = extractShiftFromContent(rows);
    sheetsProcessed++;

    // Find header row
    let headerIdx = -1;
    let timeColIdx = -1;
    for (let i = 0; i < Math.min(rows.length, 15); i++) {
      const row = rows[i].map(c => String(c).toLowerCase());
      if (row.some(c => c.includes('nome') || c.includes('name'))) {
        headerIdx = i;
        break;
      }
    }
    if (headerIdx === -1) continue;

    const headers = rows[headerIdx].map(c => String(c).toLowerCase().trim());
    const nameCol = headers.findIndex(h => h.includes('nome') || h.includes('name'));
    const susCol = headers.findIndex(h => h.includes('sus') || h.includes('cartão') || h.includes('cartao'));
    const dobCol = headers.findIndex(h => h.includes('nascimento') || h.includes('nasc'));
    const psfCol = headers.findIndex(h => h.includes('psf'));
    const motivoCol = headers.findIndex(h => h.includes('motivo') || h.includes('reason'));
    const numCol = headers.findIndex(h => h.includes('nº') || h.includes('n°') || h.includes('num') || h === 'nº');
    timeColIdx = headers.findIndex(h => h.includes('horário') || h.includes('horario') || h.includes('chegada'));

    if (!dateAppointments.has(date)) {
      dateAppointments.set(date, []);
    }
    const dayAppts = dateAppointments.get(date)!;

    let morningCount = dayAppts.filter(a => a.slot <= 15).length;
    let afternoonCount = dayAppts.filter(a => a.slot >= 16).length;

    for (let i = headerIdx + 1; i < rows.length; i++) {
      const row = rows[i];
      const rawName = nameCol >= 0 ? String(row[nameCol] || '').trim() : '';
      if (!rawName || rawName.length < 2) continue;

      const name = rawName.toUpperCase();
      const susCard = susCol >= 0 ? String(row[susCol] || '').trim() : '';
      const dob = dobCol >= 0 ? normalizeDate(row[dobCol]) : '';
      const psf = psfCol >= 0 ? String(row[psfCol] || '').trim().toUpperCase() : '';
      const reason = motivoCol >= 0 ? String(row[motivoCol] || '').trim() : '';

      // Find or create patient - deduplicate by SUS card first, then by normalized name
      const nameKey = normalizeName(name);
      let patient = (susCard && patientMap.get(`sus:${susCard}`)) || patientMap.get(nameKey);
      
      if (!patient) {
        patient = { id: generateId(), name, susCard, dob, psf, observations: '' };
        patientMap.set(nameKey, patient);
        if (susCard) patientMap.set(`sus:${susCard}`, patient);
      } else {
        // Update with new info if available
        if (susCard && !patient.susCard) { patient.susCard = susCard; patientMap.set(`sus:${susCard}`, patient); }
        if (psf && !patient.psf) patient.psf = psf;
        if (dob && !patient.dob) patient.dob = dob;
      }

      // Determine slot: check if this row is morning or afternoon
      let isAfternoon = false;
      if (shift === 'ambos' && timeColIdx >= 0) {
        isAfternoon = isAfternoonTime(row[timeColIdx]);
      } else if (shift === 'tarde') {
        isAfternoon = true;
      }
      // Also check time column even for non-"ambos" sheets
      if (shift === 'manha' && timeColIdx >= 0 && isAfternoonTime(row[timeColIdx])) {
        isAfternoon = true;
      }

      let slotNum: number;
      if (isAfternoon) {
        afternoonCount++;
        slotNum = 15 + afternoonCount; // 16, 17, 18...
      } else {
        morningCount++;
        slotNum = morningCount; // 1, 2, 3...
      }

      // Prevent slot overflow
      if (!isAfternoon && slotNum > 15) continue;
      if (isAfternoon && slotNum > 32) continue;

      // Skip if slot already occupied for this date
      if (dayAppts.some(a => a.slot === slotNum)) continue;

      // Skip if patient already booked on this date
      if (dayAppts.some(a => a.patientId === patient!.id)) continue;

      dayAppts.push({
        slot: slotNum,
        date,
        patientId: patient.id,
        patientName: patient.name,
        susCard: patient.susCard,
        dob: patient.dob,
        psf: patient.psf,
        reason,
        type: 'NORMAL',
      });
    }
  }

  // Save all patients
  const patients = Array.from(new Map(
    Array.from(patientMap.entries())
      .filter(([key]) => !key.startsWith('sus:'))
      .map(([, p]) => [p.id, p])
  ).values());
  savePatients(patients);

  // Save appointments and register open days - merge with existing
  const allAppointments: Appointment[] = [];
  const existingAllAppts = getAppointments();
  
  for (const [date, appts] of dateAppointments) {
    addOpenDay(date);
    // Remove existing appointments for this date before adding new ones
    const otherAppts = existingAllAppts.filter(a => a.date !== date);
    const merged = [...otherAppts, ...appts];
    localStorage.setItem('medsched_appointments', JSON.stringify(merged));
    allAppointments.push(...appts);
  }

  return {
    patients,
    appointments: allAppointments,
    sheetsProcessed,
    patientsImported: patients.length,
  };
}
