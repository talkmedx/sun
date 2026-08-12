import { Request, Response, NextFunction } from 'express';
import * as dashboardService from '../services/dashboardService';
import * as studentService from '../services/studentService';
import * as batchService from '../services/batchService';
import * as courseService from '../services/courseService';
import * as expenseService from '../services/expenseService';
import * as vendorService from '../services/vendorService';
import * as productService from '../services/productService';
import * as admissionService from '../services/admissionService';
import * as notificationService from '../services/notificationService';
import * as reportService from '../services/reportService';
import { success, created } from '../utils/response';
import { publicUploadPath } from '../middleware/upload';

// ── Dashboard ──────────────────────────────────────────────
export const dashboard = {
  summary: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const batchId = req.query.batch_id ? Number(req.query.batch_id) : undefined;
      const fy = req.query.fy as string | undefined;
      return success(res, await dashboardService.getSummary(batchId, fy));
    } catch (e) { next(e); }
  },
  charts: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const batchId = req.query.batch_id ? Number(req.query.batch_id) : undefined;
      const fy = req.query.fy as string | undefined;
      return success(res, await dashboardService.getCharts(batchId, fy));
    } catch (e) { next(e); }
  },
  batchProfit: async (req: Request, res: Response, next: NextFunction) => {
    try {
      return success(res, await dashboardService.getBatchProfit(Number(req.params.batchId)));
    } catch (e) { next(e); }
  },
  fyProfit: async (req: Request, res: Response, next: NextFunction) => {
    try {
      return success(res, await dashboardService.getFyProfit(req.query.fy as string | undefined));
    } catch (e) { next(e); }
  },
};

// ── Students ───────────────────────────────────────────────
export const students = {
  list: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { rows, meta } = await studentService.listStudents({
        page: Number(req.query.page),
        limit: Number(req.query.limit),
        search: req.query.search as string,
        batch_id: req.query.batch_id ? Number(req.query.batch_id) : undefined,
        status: req.query.status as string,
        sort: req.query.sort as string,
        order: req.query.order as string,
      });
      return success(res, rows, 'OK', 200, meta);
    } catch (e) { next(e); }
  },
  get: async (req: Request, res: Response, next: NextFunction) => {
    try {
      return success(res, await studentService.getStudent(Number(req.params.id)));
    } catch (e) { next(e); }
  },
  create: async (req: Request, res: Response, next: NextFunction) => {
    try {
      return created(res, await studentService.createStudent(req.body, req.user!.userId));
    } catch (e) { next(e); }
  },
  update: async (req: Request, res: Response, next: NextFunction) => {
    try {
      return success(res, await studentService.updateStudent(Number(req.params.id), req.body), 'Updated');
    } catch (e) { next(e); }
  },
  remove: async (req: Request, res: Response, next: NextFunction) => {
    try {
      await studentService.deleteStudent(Number(req.params.id));
      return success(res, null, 'Deleted');
    } catch (e) { next(e); }
  },
  photo: async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) return success(res, null, 'No file', 400);
      const url = publicUploadPath('profiles', req.file.filename);
      return success(res, await studentService.updatePhoto(Number(req.params.id), url), 'Photo updated');
    } catch (e) { next(e); }
  },
  fees: async (req: Request, res: Response, next: NextFunction) => {
    try {
      return success(res, await studentService.listFees(Number(req.params.id)));
    } catch (e) { next(e); }
  },
  addFee: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const screenshot = req.file ? publicUploadPath('payments', req.file.filename) : undefined;
      return created(res, await studentService.addFee(Number(req.params.id), req.body, req.user!.userId, screenshot));
    } catch (e) { next(e); }
  },
  updateFee: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const screenshot = req.file ? publicUploadPath('payments', req.file.filename) : undefined;
      return success(res, await studentService.updateFee(Number(req.params.id), Number(req.params.feeId), req.body, screenshot));
    } catch (e) { next(e); }
  },
  deleteFee: async (req: Request, res: Response, next: NextFunction) => {
    try {
      await studentService.deleteFee(Number(req.params.id), Number(req.params.feeId));
      return success(res, null, 'Fee transaction deleted');
    } catch (e) { next(e); }
  },
  products: async (req: Request, res: Response, next: NextFunction) => {
    try {
      return success(res, await studentService.listStudentProducts(Number(req.params.id)));
    } catch (e) { next(e); }
  },
  addProduct: async (req: Request, res: Response, next: NextFunction) => {
    try {
      return created(res, await studentService.addStudentProduct(Number(req.params.id), req.body, req.user!.userId));
    } catch (e) { next(e); }
  },
  updateProduct: async (req: Request, res: Response, next: NextFunction) => {
    try {
      return success(res, await studentService.updateStudentProduct(Number(req.params.id), Number(req.params.productId), req.body));
    } catch (e) { next(e); }
  },
  deleteProduct: async (req: Request, res: Response, next: NextFunction) => {
    try {
      await studentService.deleteStudentProduct(Number(req.params.id), Number(req.params.productId));
      return success(res, null, 'Student product purchase deleted');
    } catch (e) { next(e); }
  },
  documents: async (req: Request, res: Response, next: NextFunction) => {
    try {
      return success(res, await studentService.listDocuments(Number(req.params.id)));
    } catch (e) { next(e); }
  },
  addDocument: async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) return success(res, null, 'No file', 400);
      const url = publicUploadPath('documents', req.file.filename);
      return created(
        res,
        await studentService.addDocument(
          Number(req.params.id),
          req.body.title || req.file.originalname,
          url,
          req.file.mimetype,
          req.file.size,
          req.user!.userId
        )
      );
    } catch (e) { next(e); }
  },
  updateDocument: async (req: Request, res: Response, next: NextFunction) => {
    try {
      let url: string | undefined;
      if (req.file) {
        url = publicUploadPath('documents', req.file.filename);
      }
      return success(
        res,
        await studentService.updateDocument(
          Number(req.params.id),
          Number(req.params.docId),
          req.body.title,
          url,
          req.file?.mimetype,
          req.file?.size
        ),
        'Document updated'
      );
    } catch (e) { next(e); }
  },
  deleteDocument: async (req: Request, res: Response, next: NextFunction) => {
    try {
      await studentService.deleteDocument(Number(req.params.id), Number(req.params.docId));
      return success(res, null, 'Document deleted');
    } catch (e) { next(e); }
  },
};

// ── Batches ────────────────────────────────────────────────
export const batches = {
  list: async (req: Request, res: Response, next: NextFunction) => {
    try {
      return success(
        res,
        await batchService.listBatches(
          req.query.search as string,
          req.query.status as string,
          req.query.year ? Number(req.query.year) : undefined,
          req.query.course as string
        )
      );
    } catch (e) { next(e); }
  },
  dropdown: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const status = req.query.status as string | undefined;
      return success(res, await batchService.listBatchesDropdown(status));
    } catch (e) { next(e); }
  },
  publicDropdown: async (_req: Request, res: Response, next: NextFunction) => {
    try {
      return success(res, await batchService.listBatchesForAdmission());
    } catch (e) { next(e); }
  },
  get: async (req: Request, res: Response, next: NextFunction) => {
    try {
      return success(res, await batchService.getBatch(Number(req.params.id)));
    } catch (e) { next(e); }
  },
  create: async (req: Request, res: Response, next: NextFunction) => {
    try {
      return created(res, await batchService.createBatch(req.body, req.user!.userId));
    } catch (e) { next(e); }
  },
  update: async (req: Request, res: Response, next: NextFunction) => {
    try {
      return success(res, await batchService.updateBatch(Number(req.params.id), req.body), 'Updated');
    } catch (e) { next(e); }
  },
  remove: async (req: Request, res: Response, next: NextFunction) => {
    try {
      await batchService.deleteBatch(Number(req.params.id));
      return success(res, null, 'Deleted');
    } catch (e) { next(e); }
  },
};

// ── Courses ────────────────────────────────────────────────
export const courses = {
  list: async (req: Request, res: Response, next: NextFunction) => {
    try {
      return success(res, await courseService.listCourses(req.query.search as string));
    } catch (e) { next(e); }
  },
  get: async (req: Request, res: Response, next: NextFunction) => {
    try {
      return success(res, await courseService.getCourse(Number(req.params.id)));
    } catch (e) { next(e); }
  },
  create: async (req: Request, res: Response, next: NextFunction) => {
    try {
      return created(res, await courseService.createCourse({ ...req.body, created_by: req.user!.userId }));
    } catch (e) { next(e); }
  },
  update: async (req: Request, res: Response, next: NextFunction) => {
    try {
      return success(
        res,
        await courseService.updateCourse(Number(req.params.id), req.body, req.user!.userId),
        'Updated'
      );
    } catch (e) { next(e); }
  },
  feeHistory: async (req: Request, res: Response, next: NextFunction) => {
    try {
      return success(res, await courseService.getFeeHistory(Number(req.params.id)));
    } catch (e) { next(e); }
  },
  remove: async (req: Request, res: Response, next: NextFunction) => {
    try {
      await courseService.deleteCourse(Number(req.params.id));
      return success(res, null, 'Deleted');
    } catch (e) { next(e); }
  },
};

// ── Expenses ───────────────────────────────────────────────
export const expenses = {
  list: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { rows, meta } = await expenseService.listExpenses({
        page: Number(req.query.page),
        limit: Number(req.query.limit),
        search: req.query.search as string,
        batch_id: req.query.batch_id ? Number(req.query.batch_id) : undefined,
        vendor_id: req.query.vendor_id ? Number(req.query.vendor_id) : undefined,
        category: req.query.category as string,
        start_date: req.query.start_date as string,
        end_date: req.query.end_date as string,
        financial_year: req.query.financial_year as string,
      });
      return success(res, rows, 'OK', 200, meta);
    } catch (e) { next(e); }
  },
  get: async (req: Request, res: Response, next: NextFunction) => {
    try {
      return success(res, await expenseService.getExpense(Number(req.params.id)));
    } catch (e) { next(e); }
  },
  create: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const screenshot = req.file ? publicUploadPath('expenses', req.file.filename) : undefined;
      return created(res, await expenseService.createExpense(req.body, req.user!.userId, screenshot));
    } catch (e) { next(e); }
  },
  update: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const screenshot = req.file ? publicUploadPath('expenses', req.file.filename) : undefined;
      const data = screenshot ? { ...req.body, screenshot_url: screenshot } : req.body;
      return success(res, await expenseService.updateExpense(Number(req.params.id), data), 'Updated');
    } catch (e) { next(e); }
  },
  remove: async (req: Request, res: Response, next: NextFunction) => {
    try {
      await expenseService.deleteExpense(Number(req.params.id));
      return success(res, null, 'Deleted');
    } catch (e) { next(e); }
  },
  screenshot: async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) return success(res, null, 'No file', 400);
      const url = publicUploadPath('expenses', req.file.filename);
      return success(res, await expenseService.updateScreenshot(Number(req.params.id), url));
    } catch (e) { next(e); }
  },
};

// ── Vendors ────────────────────────────────────────────────
export const vendors = {
  list: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { rows, meta } = await vendorService.listVendors({
        page: Number(req.query.page),
        limit: Number(req.query.limit),
        search: req.query.search as string,
      });
      return success(res, rows, 'OK', 200, meta);
    } catch (e) { next(e); }
  },
  get: async (req: Request, res: Response, next: NextFunction) => {
    try {
      return success(res, await vendorService.getVendor(Number(req.params.id)));
    } catch (e) { next(e); }
  },
  create: async (req: Request, res: Response, next: NextFunction) => {
    try {
      return created(res, await vendorService.createVendor(req.body, req.user!.userId));
    } catch (e) { next(e); }
  },
  update: async (req: Request, res: Response, next: NextFunction) => {
    try {
      return success(res, await vendorService.updateVendor(Number(req.params.id), req.body), 'Updated');
    } catch (e) { next(e); }
  },
  remove: async (req: Request, res: Response, next: NextFunction) => {
    try {
      await vendorService.deleteVendor(Number(req.params.id));
      return success(res, null, 'Deleted');
    } catch (e) { next(e); }
  },
  credits: async (req: Request, res: Response, next: NextFunction) => {
    try {
      return success(res, await vendorService.listCredits(Number(req.params.id)));
    } catch (e) { next(e); }
  },
  addCredit: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const bill = req.file ? publicUploadPath('bills', req.file.filename) : undefined;
      return created(res, await vendorService.addCredit(Number(req.params.id), req.body, req.user!.userId, bill));
    } catch (e) { next(e); }
  },
  deleteCredit: async (req: Request, res: Response, next: NextFunction) => {
    try {
      await vendorService.deleteCredit(Number(req.params.id), Number(req.params.creditId));
      return success(res, null, 'Credit deleted');
    } catch (e) { next(e); }
  },
  updateCredit: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const bill = req.file ? publicUploadPath('bills', req.file.filename) : undefined;
      return success(res, await vendorService.updateCredit(Number(req.params.id), Number(req.params.creditId), req.body, bill));
    } catch (e) { next(e); }
  },
  expenses: async (req: Request, res: Response, next: NextFunction) => {
    try {
      return success(res, await vendorService.listVendorExpenses(Number(req.params.id)));
    } catch (e) { next(e); }
  },
};

// ── Products ───────────────────────────────────────────────
export const products = {
  list: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { rows, meta } = await productService.listProducts({
        page: Number(req.query.page),
        limit: Number(req.query.limit),
        search: req.query.search as string,
        vendor_id: req.query.vendor_id ? Number(req.query.vendor_id) : undefined,
        stock_status: req.query.stock_status as 'available' | 'out_of_stock' | 'all',
      });
      return success(res, rows, 'OK', 200, meta);
    } catch (e) { next(e); }
  },
  summary: async (_req: Request, res: Response, next: NextFunction) => {
    try {
      return success(res, await productService.getProductSummary());
    } catch (e) { next(e); }
  },
  get: async (req: Request, res: Response, next: NextFunction) => {
    try {
      return success(res, await productService.getProduct(Number(req.params.id)));
    } catch (e) { next(e); }
  },
  create: async (req: Request, res: Response, next: NextFunction) => {
    try {
      return created(res, await productService.createProduct(req.body, req.user!.userId));
    } catch (e) { next(e); }
  },
  update: async (req: Request, res: Response, next: NextFunction) => {
    try {
      return success(res, await productService.updateProduct(Number(req.params.id), req.body, req.user!.userId), 'Updated');
    } catch (e) { next(e); }
  },
  remove: async (req: Request, res: Response, next: NextFunction) => {
    try {
      await productService.deleteProduct(Number(req.params.id));
      return success(res, null, 'Deleted');
    } catch (e) { next(e); }
  },
  priceHistory: async (req: Request, res: Response, next: NextFunction) => {
    try {
      return success(res, await productService.getPriceHistory(Number(req.params.id)));
    } catch (e) { next(e); }
  },
  stock: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { quantity, type } = req.body;
      return success(res, await productService.adjustStock(Number(req.params.id), Number(quantity), type));
    } catch (e) { next(e); }
  },
};

// ── Admissions ─────────────────────────────────────────────
export const admissions = {
  list: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { rows, meta } = await admissionService.listAdmissions({
        page: Number(req.query.page),
        limit: Number(req.query.limit),
        search: req.query.search as string,
        status: req.query.status as string,
      });
      return success(res, rows, 'OK', 200, meta);
    } catch (e) { next(e); }
  },
  get: async (req: Request, res: Response, next: NextFunction) => {
    try {
      return success(res, await admissionService.getAdmission(Number(req.params.id)));
    } catch (e) { next(e); }
  },
  submit: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      const photo = files?.photo?.[0] ? publicUploadPath('admissions', files.photo[0].filename) : undefined;
      const legacyProof = files?.proof?.[0] ? publicUploadPath('admissions', files.proof[0].filename) : undefined;
      const proofFiles = files?.proofs || [];
      const titles = req.body.proof_titles;
      const titleArr = Array.isArray(titles) ? titles : titles ? [titles] : [];
      const proofDocuments = proofFiles.map((f, i) => ({
        title: titleArr[i] || 'Proof',
        url: publicUploadPath('admissions', f.filename),
        fileType: f.mimetype,
        fileSize: f.size,
      }));
      return created(
        res,
        await admissionService.submitAdmission(req.body, photo, legacyProof, proofDocuments),
        'Application submitted'
      );
    } catch (e) { next(e); }
  },
  approve: async (req: Request, res: Response, next: NextFunction) => {
    try {
      return success(res, await admissionService.approveAdmission(Number(req.params.id), req.user!.userId), 'Approved');
    } catch (e) { next(e); }
  },
  reject: async (req: Request, res: Response, next: NextFunction) => {
    try {
      return success(res, await admissionService.rejectAdmission(Number(req.params.id), req.body.rejection_reason, req.user!.userId), 'Rejected');
    } catch (e) { next(e); }
  },
  editLink: async (req: Request, res: Response, next: NextFunction) => {
    try {
      return success(res, await admissionService.generateEditLink(Number(req.params.id)));
    } catch (e) { next(e); }
  },
  getByToken: async (req: Request, res: Response, next: NextFunction) => {
    try {
      return success(res, await admissionService.getByEditToken(String(req.params.token)));
    } catch (e) { next(e); }
  },
  updateByToken: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      const photo = files?.photo?.[0] ? publicUploadPath('admissions', files.photo[0].filename) : undefined;
      const legacyProof = files?.proof?.[0] ? publicUploadPath('admissions', files.proof[0].filename) : undefined;
      const proofFiles = files?.proofs || [];
      const titles = req.body.proof_titles;
      const titleArr = Array.isArray(titles) ? titles : titles ? [titles] : [];
      const proofDocuments = proofFiles.map((f, i) => ({
        title: titleArr[i] || 'Proof',
        url: publicUploadPath('admissions', f.filename),
        fileType: f.mimetype,
        fileSize: f.size,
      }));
      return success(
        res,
        await admissionService.updateByEditToken(String(req.params.token), req.body, photo, legacyProof, proofDocuments),
        'Updated'
      );
    } catch (e) { next(e); }
  },
};

// ── Notifications ──────────────────────────────────────────
export const notifications = {
  list: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await notificationService.list(
        req.user!.userId,
        Number(req.query.page) || 1,
        Number(req.query.limit) || 20
      );
      return success(res, data, 'OK', 200, data.meta);
    } catch (e) { next(e); }
  },
  markRead: async (req: Request, res: Response, next: NextFunction) => {
    try {
      return success(res, await notificationService.markRead(Number(req.params.id), req.user!.userId));
    } catch (e) { next(e); }
  },
  markAllRead: async (req: Request, res: Response, next: NextFunction) => {
    try {
      await notificationService.markAllRead(req.user!.userId);
      return success(res, null, 'All marked as read');
    } catch (e) { next(e); }
  },
  remove: async (req: Request, res: Response, next: NextFunction) => {
    try {
      await notificationService.remove(Number(req.params.id), req.user!.userId);
      return success(res, null, 'Deleted');
    } catch (e) { next(e); }
  },
};

// ── Reports ────────────────────────────────────────────────
export const reports = {
  students: async (req: Request, res: Response, next: NextFunction) => {
    try {
      return success(res, await reportService.studentReport(req.query.batch_id ? Number(req.query.batch_id) : undefined));
    } catch (e) { next(e); }
  },
  fees: async (req: Request, res: Response, next: NextFunction) => {
    try {
      return success(res, await reportService.feeReport(req.query.fy as string, req.query.batch_id ? Number(req.query.batch_id) : undefined));
    } catch (e) { next(e); }
  },
  expenses: async (req: Request, res: Response, next: NextFunction) => {
    try {
      return success(res, await reportService.expenseReport(req.query.fy as string, req.query.batch_id ? Number(req.query.batch_id) : undefined));
    } catch (e) { next(e); }
  },
  vendors: async (_req: Request, res: Response, next: NextFunction) => {
    try {
      return success(res, await reportService.vendorReport());
    } catch (e) { next(e); }
  },
  batches: async (_req: Request, res: Response, next: NextFunction) => {
    try {
      return success(res, await reportService.batchReport());
    } catch (e) { next(e); }
  },
  inventory: async (_req: Request, res: Response, next: NextFunction) => {
    try {
      return success(res, await reportService.inventoryReport());
    } catch (e) { next(e); }
  },
  profit: async (req: Request, res: Response, next: NextFunction) => {
    try {
      return success(res, await reportService.profitReport(req.query.fy as string));
    } catch (e) { next(e); }
  },
  export: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const type = String(req.params.type);
      const format = (req.query.format as string) || 'xlsx';
      const qp = {
        fy: req.query.fy as string | undefined,
        batch_id: req.query.batch_id ? Number(req.query.batch_id) : undefined,
      };
      if (format === 'pdf') {
        await reportService.exportPdf(res, type, qp);
      } else {
        await reportService.exportExcel(res, type, qp);
      }
    } catch (e) { next(e); }
  },
};
