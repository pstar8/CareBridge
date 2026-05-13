import { appointments, medications, conditions } from '../data/mockData';
import { KEYS, readStorage } from './storage';

function mergeById(base, added) {
  const map = new Map();
  [...base, ...added].forEach(item => map.set(String(item.id), item));
  return Array.from(map.values());
}

export function getAllAppointments() {
  return mergeById(appointments, readStorage(KEYS.appointments, []));
}
export function getAllMedications() {
  return mergeById(medications, readStorage(KEYS.medications, []));
}
export function getAllConditions() {
  return mergeById(conditions, readStorage(KEYS.conditions, []));
}
export function findAppointment(id) {
  return getAllAppointments().find(a => String(a.id) === String(id));
}
export function findMedication(id) {
  return getAllMedications().find(m => String(m.id) === String(id));
}
export function findCondition(id) {
  return getAllConditions().find(c => String(c.id) === String(id));
}
export function relatedMedications(condition) {
  return getAllMedications().filter(m => condition?.relatedMedicationIds?.map(String).includes(String(m.id)) || m.reason?.toLowerCase().includes(condition?.name?.toLowerCase() || ''));
}
export function relatedAppointments(condition) {
  return getAllAppointments().filter(a => condition?.relatedAppointmentIds?.map(String).includes(String(a.id)) || a.notes?.toLowerCase().includes(condition?.name?.toLowerCase() || ''));
}
