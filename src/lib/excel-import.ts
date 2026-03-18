import * as XLSX from 'xlsx';
import { Patient, Appointment } from '@/types/scheduling';
import { getPatients, savePatients, getAppointments, addOpenDay } from '@/lib/storage';

function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

function normalizeDateStr(val: unknown): string {
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

function toIsoDate(val: unknown): string | null {
  if (!val) return null;
  const s = normalizeDateStr(val).split('/');
  if (s.length === 3) {
    const d = s[0].padStart(2, '0');
    const m = s[1].padStart(2, '0');
    const y = s[2].length === 2 ? '20' + s[2] : s[2];
    return `${y}-${m}-${d}`;
  }
  return null;
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

function detectShift(val: string): 'manha' | 'tarde' | null {
  const s = val.toLowerCase();
  if (s.includes('manhã') || s.includes('manha') || s.includes('08:') || s.includes('07:')) return 'manha';
  if (s.includes('tarde') || s.includes('14:') || s.includes('13:')) return 'tarde';
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

  existingPatients.forEach(p => {
    const nameKey = normalizeName(p.name);
    patientMap.set(nameKey, p);
    if (p.susCard) patientMap.set(`sus:${p.susCard}`, p);
  });

  const dateToAppts = new Map<string, Appointment[]>();
  let sheetsProcessed = 0;

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    if (rows.length < 3) continue;

    const sheetWideDate = extractDateFromContent(rows) || extractDateFromSheetName(sheetName);
    sheetsProcessed++;

    // Find header
    let headerIdx = -1;
    for (let i = 0; i < Math.min(rows.length, 25); i++) {
      const row = rows[i].map(c => String(c).toLowerCase());
      if (row.some(c => c.includes('nome') || c.includes('paciente'))) {
        headerIdx = i;
        break;
      }
    }
    if (headerIdx === -1) continue;

    const headers = rows[headerIdx].map(c => String(c).toLowerCase().trim());
    const nameCol = headers.findIndex(h => h.includes('nome') || h.includes('paciente'));
    const susCol = headers.findIndex(h => h.includes('sus') || h.includes('cartão') || h.includes('cartao'));
    const dobCol = headers.findIndex(h => h.includes('nascimento') || h.includes('nasc'));
    const psfCol = headers.findIndex(h => h.includes('psf') || h.includes('unidade'));
    const motivoCol = headers.findIndex(h => h.includes('motivo') || h.includes('queixa') || h.includes('observação'));
    const dateCol = headers.findIndex(h => h === 'data' || h.includes('data atendimento') || h.includes('data da consulta'));
    const numCol = headers.findIndex(h => h.includes('nº') || h.includes('n°') || h.includes('num') || h === 'vaga' || h === 'slot');
    const periodCol = headers.findIndex(h => h.includes('período') || h.includes('periodo') || h.includes('turno') || h.includes('horário'));

    let currentShiftIsAfternoon = false;

    for (let i = headerIdx + 1; i < rows.length; i++) {
      const row = rows[i];
      const rowStr = row.join(' ').toLowerCase();

      // Detect shift change in row content (e.g. a separator row saying "TARDE" or "CIDADE")
      if (rowStr.includes('tarde') || rowStr.includes('cidade') || rowStr.includes('14:00') || rowStr.includes('13:00')) {
        currentShiftIsAfternoon = true;
      } else if (rowStr.includes('manhã') || rowStr.includes('manha') || rowStr.includes('rural') || rowStr.includes('08:00') || rowStr.includes('07:00')) {
        currentShiftIsAfternoon = false;
      }

      const rawName = nameCol >= 0 ? String(row[nameCol] || '').trim() : '';
      if (!rawName || rawName.length < 2) continue;

      const dateStr = dateCol >= 0 ? toIsoDate(row[dateCol]) : sheetWideDate;
      if (!dateStr) continue;

      const name = rawName.toUpperCase();
      const susCard = susCol >= 0 ? String(row[susCol] || '').trim() : '';
      const dob = dobCol >= 0 ? normalizeDateStr(row[dobCol]) : '';
      const psf = psfCol >= 0 ? String(row[psfCol] || '').trim().toUpperCase() : '';
      const reason = motivoCol >= 0 ? String(row[motivoCol] || '').trim() : '';

      const nameKey = normalizeName(name);
      let patient = (susCard && patientMap.get(`sus:${susCard}`)) || patientMap.get(nameKey);
      
      if (!patient) {
        patient = { id: generateId(), name, susCard, dob, psf, observations: '' };
        patientMap.set(nameKey, patient);
        if (susCard) patientMap.set(`sus:${susCard}`, patient);
      } else {
        if (susCard && !patient.susCard) { patient.susCard = susCard; patientMap.set(`sus:${susCard}`, patient); }
        if (psf && !patient.psf) patient.psf = psf;
        if (dob && !patient.dob) patient.dob = dob;
      }

      if (!dateToAppts.has(dateStr)) dateToAppts.set(dateStr, []);
      const dayAppts = dateToAppts.get(dateStr)!;

      // Determine slot
      let isAfternoon = currentShiftIsAfternoon;
      if (periodCol >= 0) {
        const pStr = String(row[periodCol]);
        const dShift = detectShift(pStr);
        if (dShift === 'tarde') isAfternoon = true;
        if (dShift === 'manha') isAfternoon = false;
      }

      let slotNum = numCol >= 0 ? Number(row[numCol]) : 0;
      if (isNaN(slotNum) || slotNum <= 0) {
        const morningCount = dayAppts.filter(a => a.slot <= 15).length;
        const afternoonCount = dayAppts.filter(a => a.slot >= 16).length;
        if (isAfternoon) slotNum = 16 + afternoonCount;
        else slotNum = 1 + morningCount;
      }

      if (slotNum > 32) continue; // safety cap

      // Avoid double booking the same slot or same patient on same day
      if (dayAppts.some(a => a.slot === slotNum)) {
        // Find next free slot in that period
        if (isAfternoon) {
          for (let s = 16; s <= 32; s++) if (!dayAppts.some(a => a.slot === s)) { slotNum = s; break; }
        } else {
          for (let s = 1; s <= 15; s++) if (!dayAppts.some(a => a.slot === s)) { slotNum = s; break; }
        }
      }
      
      if (dayAppts.some(a => a.patientId === patient!.id)) continue;

      dayAppts.push({
        slot: slotNum,
        date: dateStr,
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

  // Final merge and save
  const finalPatients = Array.from(new Map(
    Array.from(patientMap.entries()).filter(([k]) => !k.startsWith('sus:')).map(([, p]) => [p.id, p])
  ).values());
  savePatients(finalPatients);

  const existingAllAppts = getAppointments();
  const allDatesToMerge = Array.from(dateToAppts.keys());
  
  // Keep existing appts for dates NOT in the import
  let finalAppts = existingAllAppts.filter(a => !allDatesToMerge.includes(a.date));
  
  // Add all appts from import
  for (const [date, appts] of dateToAppts) {
    addOpenDay(date);
    finalAppts.push(...appts);
  }

  localStorage.setItem('medsched_appointments', JSON.stringify(finalAppts));

  return {
    patients: finalPatients,
    appointments: finalAppts,
    sheetsProcessed,
    patientsImported: finalPatients.length,
  };
}
