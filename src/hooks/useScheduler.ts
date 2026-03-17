import { useState, useCallback } from 'react';
import { Appointment, Patient } from '@/types/scheduling';
import {
  getAppointments, saveAppointment, removeAppointment,
  clearDay, duplicateDay, getPatients, searchPatients,
  isPatientBookedOnDate, upsertPatient, deletePatient,
  getDaysWithAppointments
} from '@/lib/storage';

export function useScheduler() {
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });
  const [appointments, setAppointments] = useState<Appointment[]>(() => getAppointments(selectedDate));
  const [patients, setPatients] = useState<Patient[]>(() => getPatients());
  const [daysWithAppts, setDaysWithAppts] = useState<Set<string>>(() => getDaysWithAppointments());

  const refreshDays = useCallback(() => {
    setDaysWithAppts(getDaysWithAppointments());
  }, []);

  const changeDate = useCallback((date: string) => {
    setSelectedDate(date);
    setAppointments(getAppointments(date));
  }, []);

  const bookSlot = useCallback((appt: Appointment) => {
    const updated = saveAppointment(appt);
    setAppointments(updated);
    upsertPatient({
      id: appt.patientId,
      name: appt.patientName,
      susCard: appt.susCard,
      dob: appt.dob,
      psf: appt.psf,
      observations: '',
    });
    setPatients(getPatients());
    refreshDays();
  }, [refreshDays]);

  const cancelSlot = useCallback((slot: number) => {
    const updated = removeAppointment(selectedDate, slot);
    setAppointments(updated);
    refreshDays();
  }, [selectedDate, refreshDays]);

  const resetDay = useCallback(() => {
    clearDay(selectedDate);
    setAppointments([]);
    refreshDays();
  }, [selectedDate, refreshDays]);

  const copyDay = useCallback((fromDate: string) => {
    const updated = duplicateDay(fromDate, selectedDate);
    setAppointments(updated);
    refreshDays();
  }, [selectedDate, refreshDays]);

  const checkDuplicate = useCallback((patientId: string, excludeSlot?: number) => {
    return isPatientBookedOnDate(selectedDate, patientId, excludeSlot);
  }, [selectedDate]);

  const search = useCallback((query: string) => {
    return searchPatients(query);
  }, []);

  const refreshPatients = useCallback(() => {
    setPatients(getPatients());
  }, []);

  const refreshAll = useCallback(() => {
    setPatients(getPatients());
    setAppointments(getAppointments(selectedDate));
    refreshDays();
  }, [selectedDate, refreshDays]);

  const updatePatient = useCallback((patient: Patient) => {
    upsertPatient(patient);
    setPatients(getPatients());
  }, []);

  const removePatient = useCallback((id: string) => {
    deletePatient(id);
    setPatients(getPatients());
  }, []);

  const manhaAppts = appointments.filter(a => a.slot <= 15);
  const tardeAppts = appointments.filter(a => a.slot > 15);
  const livresManha = 15 - manhaAppts.length;
  const livresTarde = 15 - tardeAppts.length;

  return {
    selectedDate, changeDate,
    appointments, bookSlot, cancelSlot, resetDay, copyDay,
    checkDuplicate, search,
    patients, refreshPatients, refreshAll, updatePatient, removePatient,
    manhaAppts, tardeAppts, livresManha, livresTarde,
    daysWithAppts,
  };
}
