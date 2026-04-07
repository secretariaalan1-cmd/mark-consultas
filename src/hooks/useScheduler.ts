import { useState, useCallback, useEffect } from 'react';
import { Appointment, Patient } from '@/types/scheduling';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useScheduler() {
  const { workspaceId } = useAuth();
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [daysWithAppts, setDaysWithAppts] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const mapRow = (r: any): Appointment => ({
    slot: r.slot,
    date: r.date,
    patientId: r.patient_id || '',
    patientName: r.patient_name,
    susCard: r.sus_card || '',
    dob: r.dob || '',
    psf: r.psf || '',
    reason: r.reason || '',
    type: (r.type || 'NORMAL') as 'NORMAL' | 'RETORNO',
    printed: r.printed || false,
    time: r.time || '',
  });

  const fetchAppointments = useCallback(async (date: string) => {
    if (!workspaceId) return;
    const { data } = await supabase
      .from('appointments')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('date', date);
    setAppointments((data || []).map(mapRow));
  }, [workspaceId]);

  const fetchDays = useCallback(async () => {
    if (!workspaceId) return;
    const { data } = await supabase
      .from('appointments')
      .select('date')
      .eq('workspace_id', workspaceId);
    setDaysWithAppts(new Set((data || []).map(d => d.date)));
  }, [workspaceId]);

  const fetchPatients = useCallback(async () => {
    if (!workspaceId) return;
    const { data } = await supabase
      .from('patients')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('name');
    setPatients((data || []).map(p => ({
      id: p.id,
      name: p.name,
      susCard: p.sus_card || '',
      dob: p.dob || '',
      psf: p.psf || '',
      observations: p.observations || '',
    })));
  }, [workspaceId]);

  useEffect(() => {
    if (!workspaceId) return;
    setLoading(true);
    Promise.all([fetchAppointments(selectedDate), fetchDays(), fetchPatients()])
      .finally(() => setLoading(false));
  }, [workspaceId]);

  const changeDate = useCallback(async (date: string) => {
    setSelectedDate(date);
    await fetchAppointments(date);
  }, [fetchAppointments]);

  const bookSlot = useCallback(async (appt: Appointment) => {
    if (!workspaceId) return;

    // Upsert patient
    const { data: existingPatients } = await supabase
      .from('patients')
      .select('id')
      .eq('workspace_id', workspaceId)
      .or(`name.eq.${appt.patientName},sus_card.eq.${appt.susCard || 'NONE'}`)
      .limit(1);

    const patientId = existingPatients?.[0]?.id;

    if (patientId) {
      await supabase.from('patients').update({
        name: appt.patientName,
        sus_card: appt.susCard,
        dob: appt.dob,
        psf: appt.psf,
      }).eq('id', patientId);
    } else {
      await supabase.from('patients').insert({
        workspace_id: workspaceId,
        name: appt.patientName,
        sus_card: appt.susCard,
        dob: appt.dob,
        psf: appt.psf,
        observations: '',
      });
    }

    // Upsert appointment (delete old + insert new)
    await supabase
      .from('appointments')
      .delete()
      .eq('workspace_id', workspaceId)
      .eq('date', appt.date)
      .eq('slot', appt.slot);

    await supabase.from('appointments').insert({
      workspace_id: workspaceId,
      slot: appt.slot,
      date: appt.date,
      patient_id: patientId || null,
      patient_name: appt.patientName,
      sus_card: appt.susCard,
      dob: appt.dob,
      psf: appt.psf,
      reason: appt.reason,
      type: appt.type,
      printed: appt.printed || false,
      time: appt.time || '',
    });

    await Promise.all([fetchAppointments(appt.date), fetchDays(), fetchPatients()]);
  }, [workspaceId, fetchAppointments, fetchDays, fetchPatients]);

  const cancelSlot = useCallback(async (slot: number) => {
    if (!workspaceId) return;
    await supabase
      .from('appointments')
      .delete()
      .eq('workspace_id', workspaceId)
      .eq('date', selectedDate)
      .eq('slot', slot);
    await Promise.all([fetchAppointments(selectedDate), fetchDays()]);
  }, [workspaceId, selectedDate, fetchAppointments, fetchDays]);

  const resetDay = useCallback(async () => {
    if (!workspaceId) return;
    await supabase
      .from('appointments')
      .delete()
      .eq('workspace_id', workspaceId)
      .eq('date', selectedDate);
    setAppointments([]);
    await fetchDays();
  }, [workspaceId, selectedDate, fetchDays]);

  const copyDay = useCallback(async (fromDate: string) => {
    if (!workspaceId) return;
    const { data: source } = await supabase
      .from('appointments')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('date', fromDate);

    if (!source || source.length === 0) return;

    // Clear target day
    await supabase
      .from('appointments')
      .delete()
      .eq('workspace_id', workspaceId)
      .eq('date', selectedDate);

    const copies = source.map(a => ({
      workspace_id: workspaceId,
      slot: a.slot,
      date: selectedDate,
      patient_id: a.patient_id,
      patient_name: a.patient_name,
      sus_card: a.sus_card,
      dob: a.dob,
      psf: a.psf,
      reason: a.reason,
      type: a.type,
      time: a.time || '',
    }));
    await supabase.from('appointments').insert(copies);
    await Promise.all([fetchAppointments(selectedDate), fetchDays()]);
  }, [workspaceId, selectedDate, fetchAppointments, fetchDays]);

  const markAsPrinted = useCallback(async (slot: number) => {
    if (!workspaceId) return;
    await supabase
      .from('appointments')
      .update({ printed: true })
      .eq('workspace_id', workspaceId)
      .eq('date', selectedDate)
      .eq('slot', slot);
    await fetchAppointments(selectedDate);
  }, [workspaceId, selectedDate, fetchAppointments]);

  const checkDuplicate = useCallback(async (patientId: string, excludeSlot?: number): Promise<boolean> => {
    if (!workspaceId) return false;
    const { data } = await supabase
      .from('appointments')
      .select('slot')
      .eq('workspace_id', workspaceId)
      .eq('date', selectedDate)
      .eq('patient_name', patientId); // We use patient_name for matching
    if (!data) return false;
    return data.some(a => a.slot !== excludeSlot);
  }, [workspaceId, selectedDate]);

  const search = useCallback(async (query: string): Promise<Patient[]> => {
    if (!workspaceId || query.length < 2) return [];
    const { data } = await supabase
      .from('patients')
      .select('*')
      .eq('workspace_id', workspaceId)
      .or(`name.ilike.%${query}%,sus_card.ilike.%${query}%`)
      .limit(10);
    return (data || []).map(p => ({
      id: p.id,
      name: p.name,
      susCard: p.sus_card || '',
      dob: p.dob || '',
      psf: p.psf || '',
      observations: p.observations || '',
    }));
  }, [workspaceId]);

  const refreshAll = useCallback(async () => {
    await Promise.all([fetchAppointments(selectedDate), fetchDays(), fetchPatients()]);
  }, [selectedDate, fetchAppointments, fetchDays, fetchPatients]);

  const updatePatient = useCallback(async (patient: Patient) => {
    if (!workspaceId) return;
    await supabase.from('patients').update({
      name: patient.name,
      sus_card: patient.susCard,
      dob: patient.dob,
      psf: patient.psf,
      observations: patient.observations,
    }).eq('id', patient.id);
    await fetchPatients();
  }, [workspaceId, fetchPatients]);

  const removePatient = useCallback(async (id: string) => {
    await supabase.from('patients').delete().eq('id', id);
    await fetchPatients();
  }, [fetchPatients]);

  const getLastAppointment = useCallback(async (patientName: string, beforeDate?: string): Promise<Appointment | null> => {
    if (!workspaceId) return null;
    let query = supabase
      .from('appointments')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('patient_name', patientName)
      .order('date', { ascending: false })
      .limit(1);
    if (beforeDate) query = query.lt('date', beforeDate);
    const { data } = await query;
    return data && data.length > 0 ? mapRow(data[0]) : null;
  }, [workspaceId]);

  const manhaAppts = appointments.filter(a => a.slot <= 15);
  const tardeAppts = appointments.filter(a => a.slot >= 16 && a.slot <= 32);
  const livresManha = 15 - manhaAppts.length;
  const livresTarde = 17 - tardeAppts.length;

  return {
    selectedDate, changeDate,
    appointments, bookSlot, cancelSlot, resetDay, copyDay, markAsPrinted,
    checkDuplicate, search, getLastAppointment,
    patients, refreshAll, updatePatient, removePatient,
    manhaAppts, tardeAppts, livresManha, livresTarde,
    daysWithAppts, loading,
  };
}
