import { Patient, Appointment } from '@/types/scheduling';

const PATIENTS_KEY = 'medsched_patients';
const APPOINTMENTS_KEY = 'medsched_appointments';
const OPEN_DAYS_KEY = 'medsched_open_days';

export function getPatients(): Patient[] {
  const data = localStorage.getItem(PATIENTS_KEY);
  return data ? JSON.parse(data) : [];
}

export function savePatients(patients: Patient[]) {
  localStorage.setItem(PATIENTS_KEY, JSON.stringify(patients));
}

function normalizeName(name: string): string {
  return name.trim().toUpperCase()
    .replace(/\s+/g, ' ')
    .replace(/[.]/g, '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function upsertPatient(patient: Patient): Patient[] {
  const patients = getPatients();
  const normalizedName = normalizeName(patient.name);
  const idx = patients.findIndex(
    p => (p.susCard && patient.susCard && p.susCard === patient.susCard) || 
         normalizeName(p.name) === normalizedName
  );
  if (idx >= 0) {
    patients[idx] = { ...patients[idx], ...patient, id: patients[idx].id };
  } else {
    patients.push(patient);
  }
  savePatients(patients);
  return patients;
}

export function deletePatient(id: string): Patient[] {
  const patients = getPatients().filter(p => p.id !== id);
  savePatients(patients);
  return patients;
}

export function getAppointments(date?: string): Appointment[] {
  const data = localStorage.getItem(APPOINTMENTS_KEY);
  const all: Appointment[] = data ? JSON.parse(data) : [];
  if (date) return all.filter(a => a.date === date);
  return all;
}

export function getDaysWithAppointments(): Set<string> {
  const all = getAppointments();
  return new Set(all.map(a => a.date));
}

export function saveAppointment(appt: Appointment): Appointment[] {
  const all = getAppointments();
  const idx = all.findIndex(a => a.date === appt.date && a.slot === appt.slot);
  if (idx >= 0) {
    all[idx] = appt;
  } else {
    all.push(appt);
  }
  localStorage.setItem(APPOINTMENTS_KEY, JSON.stringify(all));
  return all.filter(a => a.date === appt.date);
}

export function removeAppointment(date: string, slot: number): Appointment[] {
  const all = getAppointments().filter(a => !(a.date === date && a.slot === slot));
  localStorage.setItem(APPOINTMENTS_KEY, JSON.stringify(all));
  return all.filter(a => a.date === date);
}

export function clearDay(date: string): void {
  const all = getAppointments().filter(a => a.date !== date);
  localStorage.setItem(APPOINTMENTS_KEY, JSON.stringify(all));
}

export function duplicateDay(fromDate: string, toDate: string): Appointment[] {
  const all = getAppointments();
  const source = all.filter(a => a.date === fromDate);
  const withoutTarget = all.filter(a => a.date !== toDate);
  const duplicated = source.map(a => ({ ...a, date: toDate }));
  const merged = [...withoutTarget, ...duplicated];
  localStorage.setItem(APPOINTMENTS_KEY, JSON.stringify(merged));
  return merged.filter(a => a.date === toDate);
}

export function isPatientBookedOnDate(date: string, patientId: string, excludeSlot?: number): boolean {
  const dayAppts = getAppointments(date);
  return dayAppts.some(a => a.patientId === patientId && a.slot !== excludeSlot);
}

export function searchPatients(query: string): Patient[] {
  if (!query || query.length < 2) return [];
  const q = query.toLowerCase();
  return getPatients().filter(p =>
    p.name.toLowerCase().includes(q) || p.susCard.includes(q)
  ).slice(0, 10);
}

// Open days management
export function getOpenDays(): string[] {
  const data = localStorage.getItem(OPEN_DAYS_KEY);
  return data ? JSON.parse(data) : [];
}

export function addOpenDay(date: string): string[] {
  const days = getOpenDays();
  if (!days.includes(date)) {
    days.push(date);
    days.sort();
    localStorage.setItem(OPEN_DAYS_KEY, JSON.stringify(days));
  }
  return days;
}

export function removeOpenDay(date: string): string[] {
  const days = getOpenDays().filter(d => d !== date);
  localStorage.setItem(OPEN_DAYS_KEY, JSON.stringify(days));
  // Also clear appointments for that day
  clearDay(date);
  return days;
}

export function isOpenDay(date: string): boolean {
  return getOpenDays().includes(date);
}

export function saveOpenDays(days: string[]) {
  localStorage.setItem(OPEN_DAYS_KEY, JSON.stringify(days));
}
