import { RowDataPacket } from 'mysql2';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { query } from '../config/database';
import { getCurrentFyBounds } from '../helpers/queryHelpers';
import { Response } from 'express';

export async function studentReport(batchId?: number) {
  const params: Record<string, unknown> = {};
  let filter = '';
  if (batchId) {
    filter = 'AND s.batch_id = :batchId';
    params.batchId = batchId;
  }
  return query<RowDataPacket[]>(
    `SELECT s.student_code, s.first_name, s.last_name, s.phone, s.email,
            b.name AS batch_name, s.fees_committed, s.fees_paid,
            (s.fees_committed - s.fees_paid) AS pending, s.status, s.created_at
     FROM students s
     LEFT JOIN batches b ON b.id = s.batch_id
     WHERE s.deleted_at IS NULL ${filter}
     ORDER BY s.created_at DESC`,
    params
  );
}

export async function feeReport(fy?: string, batchId?: number) {
  const { start, end, fy: financialYear } = getCurrentFyBounds(fy);
  const params: Record<string, unknown> = { start, end };
  let filter = '';
  if (batchId) {
    filter = 'AND ft.batch_id = :batchId';
    params.batchId = batchId;
  }
  const rows = await query<RowDataPacket[]>(
    `SELECT ft.*, s.first_name, s.last_name, s.student_code, b.name AS batch_name
     FROM fee_transactions ft
     JOIN students s ON s.id = ft.student_id
     LEFT JOIN batches b ON b.id = ft.batch_id
     WHERE ft.deleted_at IS NULL AND ft.payment_date BETWEEN :start AND :end ${filter}
     ORDER BY ft.payment_date DESC`,
    params
  );
  return { financial_year: financialYear, rows };
}

export async function expenseReport(fy?: string, batchId?: number) {
  const { start, end, fy: financialYear } = getCurrentFyBounds(fy);
  const params: Record<string, unknown> = { start, end };
  let filter = '';
  if (batchId) {
    filter = 'AND e.batch_id = :batchId';
    params.batchId = batchId;
  }
  const rows = await query<RowDataPacket[]>(
    `SELECT e.*, b.name AS batch_name, v.name AS vendor_name
     FROM expenses e
     LEFT JOIN batches b ON b.id = e.batch_id
     LEFT JOIN vendors v ON v.id = e.vendor_id
     WHERE e.deleted_at IS NULL AND e.expense_date BETWEEN :start AND :end ${filter}
     ORDER BY e.expense_date DESC`,
    params
  );
  return { financial_year: financialYear, rows };
}

export async function vendorReport() {
  return query<RowDataPacket[]>(
    `SELECT v.*,
            (SELECT COUNT(*) FROM expenses e WHERE e.vendor_id = v.id AND e.deleted_at IS NULL) AS expense_count,
            (SELECT COALESCE(SUM(e.amount),0) FROM expenses e WHERE e.vendor_id = v.id AND e.deleted_at IS NULL) AS total_expenses
     FROM vendors v WHERE v.deleted_at IS NULL ORDER BY v.name`
  );
}

export async function batchReport() {
  return query<RowDataPacket[]>(`SELECT * FROM vw_batch_summary ORDER BY start_date DESC`);
}

export async function inventoryReport() {
  return query<RowDataPacket[]>(`SELECT * FROM vw_product_stock ORDER BY name`);
}

export async function profitReport(fy?: string) {
  const { start, end, fy: financialYear } = getCurrentFyBounds(fy);

  const batches = await query<RowDataPacket[]>(`SELECT * FROM vw_batch_summary`);

  const products = await query<RowDataPacket[]>(
    `SELECT p.name,
            COALESCE(SUM(sp.quantity), 0) AS qty_sold,
            COALESCE(SUM(sp.total_amount), 0) AS revenue,
            COALESCE(SUM(sp.quantity * sp.unit_cost_price), 0) AS cost,
            COALESCE(SUM(sp.quantity * (sp.unit_selling_price - sp.unit_cost_price)), 0) AS profit
     FROM products p
     LEFT JOIN student_products sp ON sp.product_id = p.id AND sp.deleted_at IS NULL
       AND sp.purchase_date BETWEEN :start AND :end
     WHERE p.deleted_at IS NULL
     GROUP BY p.id`,
    { start, end }
  );

  const fees = await query<RowDataPacket[]>(
    `SELECT COALESCE(SUM(amount),0) AS total FROM fee_transactions
     WHERE deleted_at IS NULL AND payment_date BETWEEN :start AND :end`,
    { start, end }
  );

  const expenses = await query<RowDataPacket[]>(
    `SELECT COALESCE(SUM(amount),0) AS total FROM expenses
     WHERE deleted_at IS NULL AND expense_date BETWEEN :start AND :end`,
    { start, end }
  );

  return {
    financial_year: financialYear,
    fees_collected: Number(fees[0]?.total ?? 0),
    expenses: Number(expenses[0]?.total ?? 0),
    net_profit: Number(fees[0]?.total ?? 0) - Number(expenses[0]?.total ?? 0),
    batches,
    products,
  };
}

export async function exportExcel(
  res: Response,
  type: string,
  queryParams: { fy?: string; batch_id?: number }
) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Komal's Makeovers";
  const sheet = workbook.addWorksheet(type);

  let rows: Record<string, unknown>[] = [];

  switch (type) {
    case 'students':
      rows = (await studentReport(queryParams.batch_id)) as unknown as Record<string, unknown>[];
      break;
    case 'fees': {
      const data = await feeReport(queryParams.fy, queryParams.batch_id);
      rows = data.rows as unknown as Record<string, unknown>[];
      break;
    }
    case 'expenses': {
      const data = await expenseReport(queryParams.fy, queryParams.batch_id);
      rows = data.rows as unknown as Record<string, unknown>[];
      break;
    }
    case 'vendors':
      rows = (await vendorReport()) as unknown as Record<string, unknown>[];
      break;
    case 'batches':
      rows = (await batchReport()) as unknown as Record<string, unknown>[];
      break;
    case 'inventory':
      rows = (await inventoryReport()) as unknown as Record<string, unknown>[];
      break;
    default:
      rows = [];
  }

  if (rows.length) {
    sheet.columns = Object.keys(rows[0]).map((key) => ({
      header: key.replace(/_/g, ' ').toUpperCase(),
      key,
      width: 18,
    }));
    rows.forEach((r) => sheet.addRow(r));
    sheet.getRow(1).font = { bold: true };
  }

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=${type}-report.xlsx`);
  await workbook.xlsx.write(res);
  res.end();
}

export async function exportPdf(
  res: Response,
  type: string,
  queryParams: { fy?: string; batch_id?: number }
) {
  let rows: Record<string, unknown>[] = [];
  switch (type) {
    case 'students':
      rows = (await studentReport(queryParams.batch_id)) as unknown as Record<string, unknown>[];
      break;
    case 'batches':
      rows = (await batchReport()) as unknown as Record<string, unknown>[];
      break;
    case 'inventory':
      rows = (await inventoryReport()) as unknown as Record<string, unknown>[];
      break;
    default: {
      const data = await profitReport(queryParams.fy);
      rows = [
        {
          financial_year: data.financial_year,
          fees_collected: data.fees_collected,
          expenses: data.expenses,
          net_profit: data.net_profit,
        },
      ];
    }
  }

  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=${type}-report.pdf`);
  doc.pipe(res);

  doc.fontSize(18).text(`Komal's Makeovers — ${type.toUpperCase()} Report`, { align: 'center' });
  doc.moveDown();
  doc.fontSize(10).text(`Generated: ${new Date().toLocaleString()}`);
  doc.moveDown();

  rows.slice(0, 50).forEach((row, i) => {
    doc.fontSize(9).text(`${i + 1}. ${JSON.stringify(row)}`);
    doc.moveDown(0.3);
  });

  doc.end();
}
