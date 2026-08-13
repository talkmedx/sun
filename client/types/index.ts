export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  role: string;
  avatar_url?: string | null;
  is_active?: number;
  password?: string | null;
}

export interface Course {
  id: number;
  name: string;
  duration_days: number;
  default_fee?: number | null;
  description?: string | null;
  is_active: number;
}

export interface Batch {
  id: number;
  name: string;
  description?: string | null;
  course_fee: number;
  offer_fee?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  max_students?: number | null;
  student_count?: number;
  profit?: number;
  notes?: string | null;
  summary?: Record<string, unknown>;
}

export interface Student {
  id: number;
  student_code: string;
  first_name: string;
  last_name?: string | null;
  email?: string | null;
  phone: string;
  alternate_phone?: string | null;
  date_of_birth?: string | null;
  gender?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  photo_url?: string | null;
  batch_id?: number | null;
  batch_name?: string | null;
  fees_committed: number;
  fees_paid: number;
  pending_fees?: number;
  status: string;
  notes?: string | null;
  age?: number | null;
  designation?: string | null;
  admission_date?: string | null;
  expense_amount?: number;
  created_at: string;
}

export interface Expense {
  id: number;
  title: string;
  description?: string | null;
  amount: number;
  category?: string | null;
  batch_id?: number | null;
  batch_name?: string | null;
  vendor_id?: number | null;
  vendor_name?: string | null;
  expense_date: string;
  payment_mode: string;
  use_vendor_credit: number;
  screenshot_url?: string | null;
  financial_year?: string | null;
}

export interface Vendor {
  id: number;
  name: string;
  contact_person?: string | null;
  email?: string | null;
  phone: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  gstin?: string | null;
  pending_credit: number;
  is_active: number;
  notes?: string | null;
}

export interface Product {
  id: number;
  sku?: string | null;
  name: string;
  description?: string | null;
  vendor_id?: number | null;
  vendor_name?: string | null;
  cost_price: number;
  selling_price: number;
  profit_percent?: number;
  quantity_available: number;
  quantity_sold: number;
  stock_value?: number;
  low_stock_threshold: number;
  is_active: number;
}

export interface Admission {
  id: number;
  first_name: string;
  last_name?: string | null;
  email?: string | null;
  phone: string;
  alternate_phone?: string | null;
  date_of_birth?: string | null;
  gender?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  batch_id?: number | null;
  batch_name?: string | null;
  batch_start_date?: string | null;
  batch_end_date?: string | null;
  batch_course_fee?: number | null;
  batch_offer_fee?: number | null;
  preferred_batch_note?: string | null;
  admission_date?: string | null;
  fees_committed?: number;
  fees_collected?: number;
  student_id?: number | null;
  student_code?: string | null;
  photo_url?: string | null;
  proof_url?: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'edit_requested';
  rejection_reason?: string | null;
  created_at: string;
}

export interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  link?: string | null;
  is_read: number;
  created_at: string;
}

export interface DashboardSummary {
  financial_year: string;
  total_fees_collected: number;
  total_fees_committed: number;
  total_students: number;
  pending_fees: number;
  expenses: number;
  current_fy_expenses: number;
  pending_vendor_payments: number;
  vendors: number;
  batches: number;
  batch_revenue?: number;
  offer_expense?: number;
  fees_profit?: number;
  batch_profit: number;
  financial_year_profit: number;
  product_profit: number;
  stock_value: number;
}

export interface DashboardCharts {
  financial_year: string;
  monthly_fees: { month: string; total: number }[];
  monthly_expenses: { month: string; total: number }[];
  profit: { month: string; fees: number; expenses: number; profit: number }[];
  students: { month: string; total: number }[];
  product_sales: { month: string; total: number; quantity: number }[];
}
