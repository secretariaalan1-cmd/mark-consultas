export interface Patient {
  id: string;
  name: string;
  susCard: string;
  dob: string;
  psf: string;
  observations: string;
}

export interface Appointment {
  slot: number;
  date: string;
  patientId: string;
  patientName: string;
  susCard: string;
  dob: string;
  psf: string;
  reason: string;
  type: 'NORMAL' | 'RETORNO';
}

export type Shift = 'manha' | 'tarde';

export const SLOTS_MANHA = Array.from({ length: 15 }, (_, i) => i + 1);
export const SLOTS_TARDE = Array.from({ length: 15 }, (_, i) => i + 16);
