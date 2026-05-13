import { supabase } from './supabase'; // your existing supabase client

function mapStructuredToAppointment(structured, documentId) {
  const {
    date,
    time,
    hospital_or_clinic,
    department,
    doctor_name,
    location_address,
    preparation_instructions,
    contact_number,
  } = structured || {};

  return {
    title:       department || hospital_or_clinic || 'Appointment',
    appointment_date:        date        || null,
    appointment_time:        time        || null,
    hospital:    hospital_or_clinic || null,
    department:  department  || null,
    doctor_name:      doctor_name || null,
    address:     location_address || null,
    status:      'upcoming',
    type:        department  || 'Medical Appointment',
    notes:       contact_number ? `Contact: ${contact_number}` : null,
    preparation: Array.isArray(preparation_instructions)
  ? preparation_instructions
  : typeof preparation_instructions === 'string'
    ? preparation_instructions
        .split('\n')
        .map(s => s.trim())
        .filter(Boolean)
    : [],
    questions:   [],
    document_id: documentId || null,
    };
}

/**
 * Save an appointment extracted from a document to Supabase.
 * Called from the "Save Appointment" button in Results.jsx.
 *
 * @param {object} structuredData  - result.structured_data from /process
 * @param {string} documentId      - the document it came from
 * @returns {object|null}          - the saved row or null on failure
 */
export async function saveAppointmentToSupabase(structuredData, documentId) {
  const row = mapStructuredToAppointment(structuredData, documentId);

  const { data, error } = await supabase
    .from('appointments')
    .insert(row)
    .select()
    .single();

 if (error) {
  console.error('saveAppointmentToSupabase error:', error);
  throw error;
  }
  return data;
}

export async function fetchSupabaseAppointments() {
  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('fetchSupabaseAppointments error:', error.message);
    return [];
  }

  return (data || []).map(row => ({
    ...row,
    // Make sure these are always arrays even if saved as null
    preparation: row.preparation || [],
    questions:   row.questions   || [],
    // Mark the source so we can deduplicate against mock data
    _source: 'supabase',
  }));
}


// ─────────────────────────────────────────────────────────────────────────────
// MEDICATIONS
// ─────────────────────────────────────────────────────────────────────────────
 
function mapStructuredToMedication(structured, documentId) {
  // structured_data.medications is a list — we take the first item
  const med = structured?.medications?.[0] || {};

  const dose = [med.dosage, med.unit].filter(Boolean).join(' ');

  return {
    name:        med.name        || 'Unknown medication',
    dosage:        dose            || null,
    frequency:   med.frequency   || null,
    timing:      med.instructions || null,
    status:      'current',
    reason:      null,
    start_date:  med.start_date  || null,
    end_date:    med.end_date    || null,
    prescriber:  structured?.prescriber || null,
    notes:       med.warnings    || null,
    medication_type:        'Tablet', 
    explanation: null,
    document_id: documentId      || null,
  };
}

/**
 * Save a medication extracted from a document to Supabase.
 * Called from the "Save Medication" button in Results.jsx.
 */
export async function saveMedicationToSupabase(structuredData, documentId) {
  const row = mapStructuredToMedication(structuredData, documentId);

  const { data, error } = await supabase
    .from('medications')
    .insert(row)
    .select()
    .single();

  if (error) {
    console.error('saveMedicationToSupabase error:', error.message);
    return null;
  }
  return data;
}

/**
 * Save a manually-entered medication (from AddMedication.jsx) to Supabase.
 * Pass the full form object; it maps directly.
 */
export async function saveManualMedicationToSupabase(formData) {
  const row = {
    name:        formData.name        || null,
    dose:        formData.dose        || null,
    frequency:   formData.frequency   || null,
    timing:      formData.timing      || null,
    status:      formData.status      || 'current',
    reason:      formData.reason      || null,
    start_date:  formData.startDate   || null,
    end_date:    formData.endDate     || null,
    prescriber:  formData.prescriber  || null,
    notes:       formData.notes       || null,
    type:        formData.type        || 'Tablet',
    explanation: formData.explanation || null,
    document_id: null,
  };

  const { data, error } = await supabase
    .from('medications')
    .insert(row)
    .select()
    .single();

  if (error) {
    console.error('saveManualMedicationToSupabase error:', error);
    throw error;
}
  return data;
}

/**
 * Fetch all medications from Supabase, newest first.
 */
export async function fetchSupabaseMedications() {
  const { data, error } = await supabase
    .from('medications')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('fetchSupabaseMedications error:', error.message);
    return [];
  }

  // Normalise to match the shape AddMedication / MedicationDetails expect
  return (data || []).map(row => ({
    ...row,
    startDate:  row.start_date || '',
    endDate:    row.end_date   || '',
    questions:   row.questions   || [],
    sideEffects: row.side_effects || [],
    _source: 'supabase',
  }));
}

