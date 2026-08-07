import { z } from 'zod';

export const phoneSchema = z
  .string()
  .transform((v) => v.replace(/\D/g, '').slice(-10))
  .refine((v) => /^[6-9]\d{9}$/.test(v), { message: 'Invalid Indian phone number' });

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(6),
  newPassword: z.string().min(8).regex(/^(?=.*[A-Za-z])(?=.*\d)/, {
    message: 'Password must contain letters and numbers',
  }),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(10),
  newPassword: z.string().min(8),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(10),
});

export const studentSchema = z.object({
  first_name: z.string().min(1).max(100),
  last_name: z.string().max(100).optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal('')),
  phone: phoneSchema,
  alternate_phone: phoneSchema.optional().nullable().or(z.literal('')),
  date_of_birth: z.string().optional().nullable(),
  gender: z.enum(['female', 'male', 'other']).optional().nullable(),
  address_line1: z.string().max(255).optional().nullable(),
  address_line2: z.string().max(255).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(100).optional().nullable(),
  pincode: z.string().max(20).optional().nullable(),
  batch_id: z.coerce.number().int().positive().optional().nullable(),
  fees_committed: z.coerce.number().min(0).optional(),
  status: z.enum(['active', 'inactive', 'completed', 'dropped']).optional(),
  notes: z.string().optional().nullable(),
  age: z.coerce.number().int().optional().nullable(),
  designation: z.string().max(100).optional().nullable(),
  admission_date: z.string().optional().nullable(),
});

export const batchBaseSchema = z.object({
  name: z.string().min(1).max(150),
  description: z.string().optional().nullable(),
  course_fee: z.coerce.number().min(0),
  offer_fee: z.coerce.number().min(0).optional().nullable(),
  start_date: z.string().optional().nullable(),
  end_date: z.string().optional().nullable(),
  status: z.enum(['upcoming', 'ongoing', 'completed', 'cancelled']).optional(),
  max_students: z.coerce.number().int().positive().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const batchSchema = batchBaseSchema.refine(
  (d) => !d.offer_fee || !d.course_fee || d.offer_fee <= d.course_fee,
  { message: 'Offer fee cannot exceed course fee', path: ['offer_fee'] }
);

export const expenseSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional().nullable(),
  amount: z.coerce.number().positive('Amount must be positive'),
  category: z.string().max(100).optional().nullable(),
  batch_id: z.coerce.number().int().positive().optional().nullable(),
  vendor_id: z.coerce.number().int().positive().optional().nullable(),
  expense_date: z.string().min(1),
  payment_mode: z
    .enum(['cash', 'upi', 'card', 'bank_transfer', 'cheque', 'vendor_credit', 'other'])
    .optional(),
  use_vendor_credit: z.coerce.boolean().optional(),
});

export const vendorSchema = z.object({
  name: z.string().min(1).max(200),
  contact_person: z.string().max(150).optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal('')),
  phone: phoneSchema,
  alternate_phone: phoneSchema.optional().nullable().or(z.literal('')),
  address: z.string().optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(100).optional().nullable(),
  pincode: z.string().max(20).optional().nullable(),
  gstin: z.string().max(30).optional().nullable(),
  notes: z.string().optional().nullable(),
  is_active: z.coerce.boolean().optional(),
});

export const vendorCreditSchema = z.object({
  amount: z.coerce.number().positive(),
  description: z.string().max(500).optional().nullable(),
  transaction_date: z.string().min(1),
});

export const productSchema = z.object({
  sku: z.string().max(50).optional().nullable(),
  name: z.string().min(1).max(200),
  description: z.string().optional().nullable(),
  vendor_id: z.coerce.number().int().positive().optional().nullable(),
  cost_price: z.coerce.number().min(0),
  selling_price: z.coerce.number().min(0),
  quantity_available: z.coerce.number().int().min(0).optional(),
  low_stock_threshold: z.coerce.number().int().min(0).optional(),
  is_active: z.coerce.boolean().optional(),
});

export const feeSchema = z.object({
  amount: z.coerce.number().positive(),
  payment_mode: z.enum(['cash', 'upi', 'card', 'bank_transfer', 'cheque', 'other']).optional(),
  payment_date: z.string().min(1),
  reference_no: z.string().max(100).optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const studentProductSchema = z.object({
  product_id: z.coerce.number().int().positive(),
  quantity: z.coerce.number().int().positive(),
  purchase_date: z.string().min(1),
  payment_mode: z.enum(['cash', 'upi', 'card', 'bank_transfer', 'cheque', 'other']).optional(),
  notes: z.string().optional().nullable(),
});

export const admissionSchema = z.object({
  first_name: z.string().min(1).max(100),
  last_name: z.string().max(100).optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal('')),
  phone: phoneSchema,
  date_of_birth: z.string().optional().nullable(),
  gender: z.enum(['female', 'male', 'other']).optional().nullable(),
  address_line1: z.string().max(255).optional().nullable(),
  address_line2: z.string().max(255).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(100).optional().nullable(),
  pincode: z.string().max(20).optional().nullable(),
  batch_id: z.coerce.number().int().positive().optional().nullable(),
  preferred_batch_note: z.string().max(255).optional().nullable(),
});

export const rejectAdmissionSchema = z.object({
  rejection_reason: z.string().min(1),
});

export const createStaffSchema = z.object({
  name: z.string().min(1).max(150),
  email: z.string().email(),
  phone: phoneSchema.optional().nullable().or(z.literal('')),
  password: z.string().min(8).regex(/^(?=.*[A-Za-z])(?=.*\d)/, {
    message: 'Password must contain letters and numbers',
  }),
});

export const createUserSchema = z.object({
  name: z.string().min(1).max(150),
  email: z.string().email(),
  phone: phoneSchema.optional().nullable().or(z.literal('')),
  password: z.string().min(8).regex(/^(?=.*[A-Za-z])(?=.*\d)/, {
    message: 'Password must contain letters and numbers',
  }),
  role: z.enum(['admin', 'staff']),
});

export const updateRoleSchema = z.object({
  role: z.enum(['admin', 'staff']),
});

export const courseSchema = z.object({
  name: z.string().min(1).max(150),
  duration_days: z.coerce.number().int().positive(),
  default_fee: z.coerce.number().min(0).optional().nullable(),
  description: z.string().optional().nullable(),
  is_active: z.coerce.number().int().optional(),
});

