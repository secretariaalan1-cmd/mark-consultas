import { useState, useCallback } from 'react';
import { Appointment, Patient } from '@/types/scheduling';
import {
  getAppointments, saveAppointment, removeAppointment,
  clearDay, duplicateDay, getPatients, searchPatients,
  isPatientBookedOnDate, upsertPatient, deletePatient,
  getDaysWithAppointments, getOpenDays, addOpenDay, removeOpenDay, isOpenDay
} from '@/lib/storage';

export function useScheduler() {
  const [openDays, setOpenDays] = useState<string[]>(() => getOpenDays());
  const [selectedDate, setSelectedDate] = useState<string | null>(() => {
    const days = getOpenDays();
    const today = new Date().toISOString().split('T')[0];
    if (days.includes(today)) return today;
    // Find nearest future open day
    const future = days.filter(d => d >= today).sort();
    if (future.length > 0) return future[0];
    if (days.length > 0) return days[days.length - 1];
    return null;
  });
  const [appointments, setAppointments] = useState<Appointment[]>(() => 
    selectedDate ? getAppointments(selectedDate) : []
  );
  const [patients, setPatients] = useState<Patient[]>(() => getPatients());
  const [daysWithAppts, setDaysWithAppts] = useState<Set<string>>(() => getDaysWithAppointments());

  const refreshDays = useCallback(() => {
    setDaysWithAppts(getDaysWithAppointments());
    setOpenDays(getOpenDays());
  }, []);

  const changeDate = useCallback((date: string) => {
    setSelectedDate(date);
    setAppointments(getAppointments(date));
  }, []);

  const createDay = useCallback((date: string) => {
    addOpenDay(date);
    setOpenDays(getOpenDays());
    setSelectedDate(date);
    setAppointments(getAppointments(date));
  }, []);

  const deleteDay = useCallback((date: string) => {
    removeOpenDay(date);
    const days = getOpenDays();
    setOpenDays(days);
    refreshDays();
    if (days.length > 0) {
      const newDate = days[days.length - 1];
      setSelectedDate(newDate);
      setAppointments(getAppointments(newDate));
    } else {
      setSelectedDate(null);
      setAppointments([]);
    }
  }, [refreshDays]);

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
    if (!selectedDate) return;
    const updated = removeAppointment(selectedDate, slot);
    setAppointments(updated);
    refreshDays();
  }, [selectedDate, refreshDays]);

  const resetDay = useCallback(() => {
    if (!selectedDate) return;
    clearDay(selectedDate);
    setAppointments([]);
    refreshDays();
  }, [selectedDate, refreshDays]);

  const copyDay = useCallback((fromDate: string) => {
    if (!selectedDate) return;
    const updated = duplicateDay(fromDate, selectedDate);
    setAppointments(updated);
    refreshDays();
  }, [selectedDate, refreshDays]);

  const checkDuplicate = useCallback((patientId: string, excludeSlot?: number) => {
    if (!selectedDate) return false;
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
    setOpenDays(getOpenDays());
    if (selectedDate) {
      setAppointments(getAppointments(selectedDate));
    }
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
    daysWithAppts, openDays, createDay, deleteDay,
  };
}
