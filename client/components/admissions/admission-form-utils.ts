import { z } from 'zod';
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

const indianMobile = z
  .string()
  .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number');

export const admissionFormSchema = z.object({
  full_name: z.string().trim().min(1, 'Full name is required'),
  phone: z.string().min(1, 'Mobile number is required').pipe(indianMobile),
  alternate_phone: z.union([z.literal(''), indianMobile]),
  email: z.string().trim().min(1, 'Email address is required').email('Enter a valid email address'),
  date_of_birth: z.string().min(1, 'Date of birth is required'),
  gender: z.string().min(1, 'Gender is required'),
  admission_date: z.string().min(1, 'Admission date is required'),
  address_line1: z.string().trim().min(1, 'Permanent address is required'),
  address_line2: z.string().trim().min(1, 'Current address is required'),
  city: z.string().trim().min(1, 'City is required'),
  state: z.string().trim().min(1, 'State is required'),
  pincode: z
    .string()
    .min(1, 'Pincode is required')
    .regex(/^\d{6}$/, 'Enter a valid 6-digit pincode'),
  batch_id: z
    .string()
    .min(1, 'Please select a batch')
    .refine((v) => v !== 'none', 'Please select a batch'),
  preferred_batch_note: z.string().optional(),
});

export type AdmissionFormValues = z.infer<typeof admissionFormSchema>;

export const admissionFormDefaults: AdmissionFormValues = {
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
  batch_id: '',
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
