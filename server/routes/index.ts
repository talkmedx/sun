import { Router } from 'express';
import {
  dashboard, students, batches, courses, expenses, vendors, products,
  admissions, notifications, reports,
} from '../controllers';
import * as usersController from '../controllers/usersController';
import * as googleDriveController from '../controllers/googleDriveController';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  uploadProfile, uploadDocument, uploadExpense, uploadBill, uploadPayment, uploadAdmission,
} from '../middleware/upload';
import {
  studentSchema, batchSchema, batchBaseSchema, courseSchema, expenseSchema, vendorSchema, vendorCreditSchema,
  productSchema, feeSchema, studentProductSchema, admissionSchema, rejectAdmissionSchema,
  createStaffSchema, createUserSchema, updateRoleSchema, updateUserSchema,
} from '../validations/schemas';
import { MODULE_ROLES } from '../config/permissions';
import authRoutes from './authRoutes';

const router = Router();

const adminOnly = authorize(...MODULE_ROLES.dashboard);
const staffOk = authorize(...MODULE_ROLES.expenses);
const studentsOk = authorize(...MODULE_ROLES.students);
const usersAdmin = authorize(...MODULE_ROLES.users);

router.use('/auth', authRoutes);

router.get('/health', (_req, res) => {
  res.json({ success: true, message: 'Komal\'s Makeovers API is healthy', timestamp: new Date().toISOString() });
});

// Public admission
router.post(
  '/admissions',
  uploadAdmission.fields([
    { name: 'photo', maxCount: 1 },
    { name: 'proof', maxCount: 1 },
    { name: 'proofs', maxCount: 10 },
  ]),
  validate(admissionSchema),
  admissions.submit
);
router.get('/admissions/edit/:token', admissions.getByToken);
router.put(
  '/admissions/edit/:token',
  uploadAdmission.fields([
    { name: 'photo', maxCount: 1 },
    { name: 'proof', maxCount: 1 },
    { name: 'proofs', maxCount: 10 },
  ]),
  validate(admissionSchema),
  admissions.updateByToken
);

// Public batches for admission form
router.get('/batches/public', batches.publicDropdown);
router.get('/settings/google-drive/callback', googleDriveController.callback);

// ── Protected routes ───────────────────────────────────────
router.use(authenticate);

// User / role management (super admin enforced in controller)
router.get('/users', usersAdmin, usersController.list);
router.post('/users', usersAdmin, validate(createUserSchema), usersController.createUser);
router.post('/users/staff', usersAdmin, validate(createStaffSchema), usersController.createStaff);
router.patch('/users/:id/role', usersAdmin, validate(updateRoleSchema), usersController.updateRole);
router.patch('/users/:id/active', usersAdmin, usersController.setActive);
router.put('/users/:id', usersAdmin, validate(updateUserSchema), usersController.updateUser);
router.delete('/users/:id', usersAdmin, usersController.deleteUser);

router.get('/settings/google-drive', adminOnly, googleDriveController.status);
router.post('/settings/google-drive/credentials', adminOnly, googleDriveController.saveCredentials);
router.post('/settings/google-drive/connect', adminOnly, googleDriveController.connect);
router.post('/settings/google-drive/disconnect', adminOnly, googleDriveController.disconnect);

// Dashboard — admin only
router.get('/dashboard/summary', adminOnly, dashboard.summary);
router.get('/dashboard/charts', adminOnly, dashboard.charts);
router.get('/dashboard/batch-profit/:batchId', adminOnly, dashboard.batchProfit);
router.get('/dashboard/fy-profit', adminOnly, dashboard.fyProfit);

// Students — super admin + staff
router.get('/students', studentsOk, students.list);
router.get('/students/:id', studentsOk, students.get);
router.post('/students', studentsOk, validate(studentSchema), students.create);
router.put('/students/:id', studentsOk, validate(studentSchema.partial()), students.update);
router.delete('/students/:id', studentsOk, students.remove);
router.post('/students/:id/photo', studentsOk, uploadProfile.single('photo'), students.photo);
router.get('/students/:id/fees', studentsOk, students.fees);
router.post('/students/:id/fees', studentsOk, uploadPayment.single('screenshot'), validate(feeSchema), students.addFee);
router.put('/students/:id/fees/:feeId', studentsOk, uploadPayment.single('screenshot'), students.updateFee);
router.delete('/students/:id/fees/:feeId', studentsOk, students.deleteFee);
router.get('/students/:id/products', studentsOk, students.products);
router.post('/students/:id/products', studentsOk, validate(studentProductSchema), students.addProduct);
router.put('/students/:id/products/:productId', studentsOk, students.updateProduct);
router.delete('/students/:id/products/:productId', studentsOk, students.deleteProduct);
router.get('/students/:id/documents', studentsOk, students.documents);
router.post('/students/:id/documents', studentsOk, uploadDocument.single('file'), students.addDocument);
router.put('/students/:id/documents/:docId', studentsOk, uploadDocument.single('file'), students.updateDocument);
router.delete('/students/:id/documents/:docId', studentsOk, students.deleteDocument);

// Courses — full CRUD admin only; dropdown allowed for staff
router.get('/courses', staffOk, courses.list);
router.get('/courses/:id/fee-history', staffOk, courses.feeHistory);
router.get('/courses/:id', staffOk, courses.get);
router.post('/courses', adminOnly, validate(courseSchema), courses.create);
router.put('/courses/:id', adminOnly, validate(courseSchema.partial()), courses.update);
router.delete('/courses/:id', adminOnly, courses.remove);

// Batches — full CRUD admin only; dropdown allowed for staff (forms)
router.get('/batches/dropdown', staffOk, batches.dropdown);
router.get('/batches', adminOnly, batches.list);
router.get('/batches/:id', adminOnly, batches.get);
router.post('/batches', adminOnly, validate(batchSchema), batches.create);
router.put('/batches/:id', adminOnly, validate(batchBaseSchema.partial()), batches.update);
router.delete('/batches/:id', adminOnly, batches.remove);

// Expenses — staff + admin
router.get('/expenses', staffOk, expenses.list);
router.get('/expenses/:id', staffOk, expenses.get);
router.post('/expenses', staffOk, uploadExpense.single('screenshot'), validate(expenseSchema), expenses.create);
router.put('/expenses/:id', staffOk, validate(expenseSchema.partial()), expenses.update);
router.delete('/expenses/:id', staffOk, expenses.remove);
router.post('/expenses/:id/screenshot', staffOk, uploadExpense.single('screenshot'), expenses.screenshot);

// Vendors — staff + admin
router.get('/vendors', staffOk, vendors.list);
router.get('/vendors/:id', staffOk, vendors.get);
router.post('/vendors', staffOk, validate(vendorSchema), vendors.create);
router.put('/vendors/:id', staffOk, validate(vendorSchema.partial()), vendors.update);
router.delete('/vendors/:id', staffOk, vendors.remove);
router.get('/vendors/:id/credits', staffOk, vendors.credits);
router.post('/vendors/:id/credits', staffOk, uploadBill.single('bill'), validate(vendorCreditSchema), vendors.addCredit);
router.delete('/vendors/:id/credits/:creditId', staffOk, vendors.deleteCredit);
router.put('/vendors/:id/credits/:creditId', staffOk, uploadBill.single('bill'), vendors.updateCredit);
router.get('/vendors/:id/expenses', staffOk, vendors.expenses);

// Products — staff + admin
router.get('/products', staffOk, products.list);
router.get('/products/summary', staffOk, products.summary);
router.get('/products/:id', staffOk, products.get);
router.post('/products', staffOk, validate(productSchema), products.create);
router.put('/products/:id', staffOk, validate(productSchema.partial()), products.update);
router.delete('/products/:id', staffOk, products.remove);
router.get('/products/:id/price-history', staffOk, products.priceHistory);
router.post('/products/:id/stock', staffOk, products.stock);

// Admissions (admin + staff)
router.get('/admissions', staffOk, admissions.list);
router.get('/admissions/:id', staffOk, admissions.get);
router.post('/admissions/:id/approve', staffOk, admissions.approve);
router.post('/admissions/:id/reject', staffOk, validate(rejectAdmissionSchema), admissions.reject);
router.post('/admissions/:id/edit-link', staffOk, admissions.editLink);

// Notifications — all authenticated roles
router.get('/notifications', authorize(...MODULE_ROLES.notifications), notifications.list);
router.patch('/notifications/:id/read', authorize(...MODULE_ROLES.notifications), notifications.markRead);
router.patch('/notifications/read-all', authorize(...MODULE_ROLES.notifications), notifications.markAllRead);
router.delete('/notifications/:id', authorize(...MODULE_ROLES.notifications), notifications.remove);

// Reports — admin only
router.get('/reports/students', adminOnly, reports.students);
router.get('/reports/fees', adminOnly, reports.fees);
router.get('/reports/expenses', adminOnly, reports.expenses);
router.get('/reports/vendors', adminOnly, reports.vendors);
router.get('/reports/batches', adminOnly, reports.batches);
router.get('/reports/inventory', adminOnly, reports.inventory);
router.get('/reports/profit', adminOnly, reports.profit);
router.get('/reports/export/:type', adminOnly, reports.export);

export default router;
