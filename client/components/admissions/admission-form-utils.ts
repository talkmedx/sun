import { fullNameToRecord } from '@/lib/utils';

export const ADMISSION_PROOF_TYPES = [
  'Aadhar Card',
  'Pan Card',
  'Permanent Address Proof',
  'Current Address Proof',
] as const;

export type AdmissionProofType = (typeof ADMISSION_PROOF_TYPES)[number];

export type AdmissionProofItem = {
  type: AdmissionProofType;
  file: File;
};

export const admissionFormDefaults = {
  full_name: '',
  phone: '',
  alternate_phone: '',
  email: '',
  date_of_birth: '',
  gender: 'female',
  admission_date: new Date().toISOString().slice(0, 10),
  address_line1: '',
  address_line2: '',
  city: '',
  state: '',
  pincode: '',
  batch_id: 'none',
  preferred_batch_note: '',
};

export function buildAdmissionFormData(
  values: Record<string, string>,
  proofs: AdmissionProofItem[],
  photo?: File | null
) {
  const fd = new FormData();
  const { first_name, last_name } = fullNameToRecord(values.full_name || '');
  fd.append('first_name', first_name);
  if (last_name) fd.append('last_name', last_name);

  Object.entries(values).forEach(([k, val]) => {
    if (k === 'full_name' || !val || val === 'none') return;
    fd.append(k, val);
  });

  if (photo) fd.append('photo', photo);

  proofs.forEach((p) => {
    fd.append('proofs', p.file);
    fd.append('proof_titles', p.type);
  });

  return fd;
}

export function filterCurrentBatches<T extends { status?: string }>(batches?: T[]) {
  return (batches || []).filter((b) => b.status === 'ongoing' || b.status === 'upcoming');
}
