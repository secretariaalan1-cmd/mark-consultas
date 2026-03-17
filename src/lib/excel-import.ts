import * as XLSX from 'xlsx';
import { Patient, Appointment } from '@/types/scheduling';
import { getPatients, savePatients, saveAppointment, addOpenDay } from '@/lib/storage';

function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

function normalizeDate(val: unknown): string {
  if (!val) return '';
  if (typeof val === 'number') {
    // Excel serial date
    const d = XLSX.SSF.parse_date_code(val);
    if (d) return `${String(d.d).padStart(2,'0')}/${String(d.m).padStart(2,'0')}/${d.y}`;
  }
  const s = String(val).trim();
  // Try parsing various date formats
  const parts = s.split(/[\/\-\.]/);
  if (parts.length === 3) {
    let [a, b, c] = parts.map(Number);
    // If first part > 12, assume DD/MM/YYYY
    if (a > 12) return `${String(a).padStart(2,'0')}/${String(b).padStart(2,'0')}/${c < 100 ? 2000 + c : c}`;
    // If second > 12, assume MM/DD/YYYY  
    if (b > 12) return `${String(b).padStart(2,'0')}/${String(a).padStart(2,'0')}/${c < 100 ? 2000 + c : c}`;
    // Default DD/MM/YYYY
    return `${String(a).padStart(2,'0')}/${String(b).padStart(2,'0')}/${c < 100 ? 2000 + c : c}`;
  }
  return s;
}

function extractDateFromSheetName(name: string): string | null {
  // Try patterns like "21-08", "21.08.24", "21/08/2024"
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

  // Index existing patients
  existingPatients.forEach(p => {
    const key = p.susCard || `${p.name}|${p.dob}`;
    patientMap.set(key, p);
  });

  const allAppointments: Appointment[] = [];
  let sheetsProcessed = 0;

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    if (rows.length < 3) continue;

    const date = extractDateFromSheetName(sheetName);
    sheetsProcessed++;

    // Find header row
    let headerIdx = -1;
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

    let slotCounter = 0;
    for (let i = headerIdx + 1; i < rows.length; i++) {
      const row = rows[i];
      const name = nameCol >= 0 ? String(row[nameCol] || '').trim().toUpperCase() : '';
      if (!name || name.length < 2) continue;

      slotCounter++;
      const susCard = susCol >= 0 ? String(row[susCol] || '').trim() : '';
      const dob = dobCol >= 0 ? normalizeDate(row[dobCol]) : '';
      const psf = psfCol >= 0 ? String(row[psfCol] || '').trim().toUpperCase() : '';
      const reason = motivoCol >= 0 ? String(row[motivoCol] || '').trim() : '';
      const slotNum = numCol >= 0 && row[numCol] ? Number(row[numCol]) : slotCounter;

      const key = susCard || `${name}|${dob}`;
      let patient = patientMap.get(key);
      if (!patient) {
        patient = {
          id: generateId(),
          name,
          susCard,
          dob,
          psf,
          observations: '',
        };
        patientMap.set(key, patient);
      } else {
        if (psf && !patient.psf) patient.psf = psf;
        if (dob && !patient.dob) patient.dob = dob;
      }

      if (date) {
        allAppointments.push({
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
  }

  const patients = Array.from(patientMap.values());
  savePatients(patients);

  // Save appointments to localStorage
  for (const appt of allAppointments) {
    saveAppointment(appt);
  }

  return {
    patients,
    appointments: allAppointments,
    sheetsProcessed,
    patientsImported: patients.length,
  };
}
