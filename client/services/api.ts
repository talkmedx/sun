import { api, ApiResponse } from '@/lib/api';
import type {
  User, Student, Batch, Course, Expense, Vendor, Product, Admission,
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
  summary: (batchId?: number, fy?: string) =>
    api.get<ApiResponse<DashboardSummary>>('/dashboard/summary', { params: { batch_id: batchId, fy } }),
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
  updateFee: (id: number, feeId: number, data: FormData) =>
    api.put(`/students/${id}/fees/${feeId}`, data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  deleteFee: (id: number, feeId: number) => api.delete(`/students/${id}/fees/${feeId}`),
  products: (id: number) => api.get(`/students/${id}/products`),
  addProduct: (id: number, data: unknown) => api.post(`/students/${id}/products`, data),
  updateProduct: (id: number, productId: number, data: unknown) => api.put(`/students/${id}/products/${productId}`, data),
  deleteProduct: (id: number, productId: number) => api.delete(`/students/${id}/products/${productId}`),
  documents: (id: number) => api.get(`/students/${id}/documents`),
  addDocument: (id: number, data: FormData) =>
    api.post(`/students/${id}/documents`, data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  updateDocument: (id: number, docId: number, data: FormData) =>
    api.put(`/students/${id}/documents/${docId}`, data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  deleteDocument: (id: number, docId: number) => api.delete(`/students/${id}/documents/${docId}`),
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

export const coursesApi = {
  list: (params?: { search?: string }) => api.get<ApiResponse<Course[]>>('/courses', { params }),
  get: (id: number) => api.get<ApiResponse<Course>>(`/courses/${id}`),
  feeHistory: (id: number) => api.get(`/courses/${id}/fee-history`),
  create: (data: Record<string, unknown>) => api.post<ApiResponse<Course>>('/courses', data),
  update: (id: number, data: Record<string, unknown>) => api.put<ApiResponse<Course>>(`/courses/${id}`, data),
  remove: (id: number) => api.delete<ApiResponse<null>>(`/courses/${id}`),
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
    api.post(`/vendors/${id}/credits`, data, {
      headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
    }),
  removeCredit: (id: number, creditId: number) => api.delete(`/vendors/${id}/credits/${creditId}`),
  updateCredit: (id: number, creditId: number, data: FormData | unknown) =>
    api.put(`/vendors/${id}/credits/${creditId}`, data, {
      headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
    }),
  expenses: (id: number) => api.get(`/vendors/${id}/expenses`),
};

export const productsApi = {
  list: (params?: Record<string, unknown>) => api.get<ApiResponse<Product[]>>('/products', { params }),
  summary: () =>
    api.get<
      ApiResponse<{
        units_available: number;
        total_cost_available: number;
        total_selling_available: number;
        total_profit_available: number;
        units_sold: number;
        total_cost_sold: number;
        total_selling_sold: number;
        total_profit_sold: number;
      }>
    >('/products/summary'),
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
  updateUser: (id: number, data: {
    name?: string;
    email?: string;
    phone?: string;
    password?: string;
    role?: string;
  }) => api.put(`/users/${id}`, data),
  deleteUser: (id: number) => api.delete(`/users/${id}`),
};

export const settingsApi = {
  googleDriveStatus: () =>
    api.get<ApiResponse<{
      appConfigured: boolean;
      connected: boolean;
      email: string | null;
      expectedEmail: string;
      rootFolder: string;
      folderPattern: string;
      usingServiceAccount: boolean;
    }>>('/settings/google-drive'),
  googleDriveConnect: () => api.post<ApiResponse<{ authUrl: string }>>('/settings/google-drive/connect'),
  googleDriveDisconnect: () => api.post('/settings/google-drive/disconnect'),
};
