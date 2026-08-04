import { api, ApiResponse } from '@/lib/api';
import type {
  User, Student, Batch, Expense, Vendor, Product, Admission,
  Notification, DashboardSummary, DashboardCharts,
} from '@/types';

export const authApi = {
  login: (email: string, password: string) =>
    api.post<ApiResponse<{ accessToken: string; refreshToken: string; user: User }>>('/auth/login', { email, password }),
  me: () => api.get<ApiResponse<User>>('/auth/me'),
  logout: () => api.post('/auth/logout'),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post('/auth/change-password', { currentPassword, newPassword }),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token: string, newPassword: string) =>
    api.post('/auth/reset-password', { token, newPassword }),
};

export const dashboardApi = {
  summary: (batchId?: number) =>
    api.get<ApiResponse<DashboardSummary>>('/dashboard/summary', { params: { batch_id: batchId } }),
  charts: (batchId?: number, fy?: string) =>
    api.get<ApiResponse<DashboardCharts>>('/dashboard/charts', { params: { batch_id: batchId, fy } }),
};

export const studentsApi = {
  list: (params?: Record<string, unknown>) => api.get<ApiResponse<Student[]>>('/students', { params }),
  get: (id: number) => api.get<ApiResponse<Student>>(`/students/${id}`),
  create: (data: unknown) => api.post<ApiResponse<Student>>('/students', data),
  update: (id: number, data: unknown) => api.put<ApiResponse<Student>>(`/students/${id}`, data),
  remove: (id: number) => api.delete(`/students/${id}`),
  uploadPhoto: (id: number, file: File) => {
    const fd = new FormData();
    fd.append('photo', file);
    return api.post(`/students/${id}/photo`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  fees: (id: number) => api.get(`/students/${id}/fees`),
  addFee: (id: number, data: FormData) =>
    api.post(`/students/${id}/fees`, data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  products: (id: number) => api.get(`/students/${id}/products`),
  addProduct: (id: number, data: unknown) => api.post(`/students/${id}/products`, data),
  documents: (id: number) => api.get(`/students/${id}/documents`),
  addDocument: (id: number, data: FormData) =>
    api.post(`/students/${id}/documents`, data, { headers: { 'Content-Type': 'multipart/form-data' } }),
};

export const batchesApi = {
  list: (params?: Record<string, unknown>) => api.get<ApiResponse<Batch[]>>('/batches', { params }),
  dropdown: () => api.get<ApiResponse<Batch[]>>('/batches/dropdown'),
  public: () => api.get<ApiResponse<Batch[]>>('/batches/public'),
  get: (id: number) => api.get<ApiResponse<Batch>>(`/batches/${id}`),
  create: (data: unknown) => api.post<ApiResponse<Batch>>('/batches', data),
  update: (id: number, data: unknown) => api.put<ApiResponse<Batch>>(`/batches/${id}`, data),
  remove: (id: number) => api.delete(`/batches/${id}`),
};

export const expensesApi = {
  list: (params?: Record<string, unknown>) => api.get<ApiResponse<Expense[]>>('/expenses', { params }),
  get: (id: number) => api.get<ApiResponse<Expense>>(`/expenses/${id}`),
  create: (data: FormData) =>
    api.post('/expenses', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update: (id: number, data: unknown) => api.put(`/expenses/${id}`, data),
  remove: (id: number) => api.delete(`/expenses/${id}`),
};

export const vendorsApi = {
  list: (params?: Record<string, unknown>) => api.get<ApiResponse<Vendor[]>>('/vendors', { params }),
  get: (id: number) => api.get<ApiResponse<Vendor>>(`/vendors/${id}`),
  create: (data: unknown) => api.post('/vendors', data),
  update: (id: number, data: unknown) => api.put(`/vendors/${id}`, data),
  remove: (id: number) => api.delete(`/vendors/${id}`),
  credits: (id: number) => api.get(`/vendors/${id}/credits`),
  addCredit: (id: number, data: FormData | unknown) =>
    data instanceof FormData
      ? api.post(`/vendors/${id}/credits`, data, { headers: { 'Content-Type': 'multipart/form-data' } })
      : api.post(`/vendors/${id}/credits`, data),
  expenses: (id: number) => api.get(`/vendors/${id}/expenses`),
};

export const productsApi = {
  list: (params?: Record<string, unknown>) => api.get<ApiResponse<Product[]>>('/products', { params }),
  get: (id: number) => api.get<ApiResponse<Product>>(`/products/${id}`),
  create: (data: unknown) => api.post('/products', data),
  update: (id: number, data: unknown) => api.put(`/products/${id}`, data),
  remove: (id: number) => api.delete(`/products/${id}`),
  priceHistory: (id: number) => api.get(`/products/${id}/price-history`),
  stock: (id: number, quantity: number, type: 'add' | 'remove') =>
    api.post(`/products/${id}/stock`, { quantity, type }),
};

export const admissionsApi = {
  list: (params?: Record<string, unknown>) => api.get<ApiResponse<Admission[]>>('/admissions', { params }),
  get: (id: number) => api.get<ApiResponse<Admission>>(`/admissions/${id}`),
  submit: (data: FormData) =>
    api.post('/admissions', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  approve: (id: number) => api.post(`/admissions/${id}/approve`),
  reject: (id: number, rejection_reason: string) =>
    api.post(`/admissions/${id}/reject`, { rejection_reason }),
  editLink: (id: number) => api.post(`/admissions/${id}/edit-link`),
  getByToken: (token: string) => api.get(`/admissions/edit/${token}`),
  updateByToken: (token: string, data: FormData) =>
    api.put(`/admissions/edit/${token}`, data, { headers: { 'Content-Type': 'multipart/form-data' } }),
};

export const notificationsApi = {
  list: (params?: Record<string, unknown>) =>
    api.get<ApiResponse<{ rows: Notification[]; unreadCount: number }>>('/notifications', { params }),
  markRead: (id: number) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
  remove: (id: number) => api.delete(`/notifications/${id}`),
};

export const reportsApi = {
  students: (params?: Record<string, unknown>) => api.get('/reports/students', { params }),
  fees: (params?: Record<string, unknown>) => api.get('/reports/fees', { params }),
  expenses: (params?: Record<string, unknown>) => api.get('/reports/expenses', { params }),
  vendors: () => api.get('/reports/vendors'),
  batches: () => api.get('/reports/batches'),
  inventory: () => api.get('/reports/inventory'),
  profit: (params?: Record<string, unknown>) => api.get('/reports/profit', { params }),
  exportUrl: (type: string, format: 'xlsx' | 'pdf' = 'xlsx') =>
    `${process.env.NEXT_PUBLIC_API_URL}/reports/export/${type}?format=${format}`,
};

export const usersApi = {
  list: () => api.get<ApiResponse<User[]>>('/users'),
  createUser: (data: {
    name: string;
    email: string;
    phone?: string;
    password: string;
    role: string;
  }) => api.post('/users', data),
  createStaff: (data: { name: string; email: string; phone?: string; password: string }) =>
    api.post('/users/staff', data),
  updateRole: (id: number, role: string) => api.patch(`/users/${id}/role`, { role }),
  setActive: (id: number, is_active: boolean) =>
    api.patch(`/users/${id}/active`, { is_active }),
};
