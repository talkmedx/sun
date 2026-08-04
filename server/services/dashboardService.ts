import { RowDataPacket } from 'mysql2';
import { query, queryOne } from '../config/database';
import { getCurrentFyBounds, getFinancialYear } from '../helpers/queryHelpers';

export async function getSummary(batchId?: number) {
  const { start, end, fy } = getCurrentFyBounds();
  const batchFilter = batchId ? 'AND s.batch_id = :batchId' : '';
  const batchExpenseFilter = batchId ? 'AND e.batch_id = :batchId' : '';
  const params: Record<string, unknown> = { start, end, batchId: batchId ?? null };

  const fees = await queryOne<RowDataPacket>(
    `SELECT
       COALESCE(SUM(s.fees_committed), 0) AS total_fees_committed,
       COALESCE(SUM(s.fees_paid), 0) AS total_fees_collected,
       COALESCE(SUM(s.fees_committed - s.fees_paid), 0) AS pending_fees,
       COUNT(s.id) AS total_students
     FROM students s
     WHERE s.deleted_at IS NULL ${batchFilter}`,
    params
  );

  const expenses = await queryOne<RowDataPacket>(
    `SELECT COALESCE(SUM(e.amount), 0) AS total_expenses
     FROM expenses e
     WHERE e.deleted_at IS NULL
       AND e.expense_date BETWEEN :start AND :end
       ${batchExpenseFilter}`,
    params
  );

  const overallExpenses = await queryOne<RowDataPacket>(
    `SELECT COALESCE(SUM(e.amount), 0) AS total_expenses
     FROM expenses e
     WHERE e.deleted_at IS NULL ${batchExpenseFilter}`,
    params
  );

  const vendors = await queryOne<RowDataPacket>(
    `SELECT
       COUNT(*) AS vendor_count,
       COALESCE(SUM(pending_credit), 0) AS pending_vendor_payments
     FROM vendors WHERE deleted_at IS NULL AND is_active = 1`
  );

  const batches = await queryOne<RowDataPacket>(
    `SELECT COUNT(*) AS batch_count FROM batches WHERE deleted_at IS NULL`
  );

  const overallStudents = await queryOne<RowDataPacket>(
    `SELECT COUNT(*) AS count FROM students WHERE deleted_at IS NULL`
  );

  const stock = await queryOne<RowDataPacket>(
    `SELECT COALESCE(SUM(quantity_available * cost_price), 0) AS stock_value,
            COALESCE(SUM(
              (SELECT COALESCE(SUM(sp.quantity * (sp.unit_selling_price - sp.unit_cost_price)), 0)
               FROM student_products sp WHERE sp.product_id = p.id AND sp.deleted_at IS NULL)
            ), 0) AS product_profit
     FROM products p WHERE p.deleted_at IS NULL`
  );

  const feesCommitted = Number(fees?.total_fees_committed ?? 0);
  const fyExpenses = Number(expenses?.total_expenses ?? 0);

  // Batch profit for selected batch or aggregate
  let batchProfit = 0;
  if (batchId) {
    const bp = await queryOne<RowDataPacket>(
      `SELECT batch_profit FROM vw_batch_summary WHERE id = :batchId`,
      { batchId }
    );
    batchProfit = Number(bp?.batch_profit ?? 0);
  } else {
    const bp = await queryOne<RowDataPacket>(
      `SELECT COALESCE(SUM(batch_profit), 0) AS total FROM vw_batch_summary`
    );
    batchProfit = Number(bp?.total ?? 0);
  }

  return {
    financial_year: fy,
    total_fees_collected: Number(fees?.total_fees_collected ?? 0),
    total_fees_committed: feesCommitted,
    total_students: Number(fees?.total_students ?? 0),
    pending_fees: Number(fees?.pending_fees ?? 0),
    expenses: Number(overallExpenses?.total_expenses ?? 0),
    current_fy_expenses: fyExpenses,
    pending_vendor_payments: Number(vendors?.pending_vendor_payments ?? 0),
    vendors: Number(vendors?.vendor_count ?? 0),
    batches: Number(batches?.batch_count ?? 0),
    batch_profit: batchProfit,
    financial_year_profit: feesCommitted - fyExpenses,
    product_profit: Number(stock?.product_profit ?? 0),
    overall_students: Number(overallStudents?.count ?? 0),
    stock_value: Number(stock?.stock_value ?? 0),
  };
}

/** Build continuous YYYY-MM list from start..end (inclusive by month) */
function monthRange(start: string, end: string): string[] {
  const months: string[] = [];
  const [sy, sm] = start.slice(0, 7).split('-').map(Number);
  const [ey, em] = end.slice(0, 7).split('-').map(Number);
  let y = sy;
  let m = sm;
  while (y < ey || (y === ey && m <= em)) {
    months.push(`${y}-${String(m).padStart(2, '0')}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return months;
}

export async function getCharts(batchId?: number, fy?: string) {
  // Charts use trailing 12 months so historical seed/data always plots.
  // If an FY is explicitly passed, use that FY window instead.
  let start: string;
  let end: string;
  let financialYear: string;

  if (fy) {
    ({ start, end, fy: financialYear } = getCurrentFyBounds(fy));
  } else {
    const now = new Date();
    const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startDate = new Date(now.getFullYear(), now.getMonth() - 23, 1);
    const fmt = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    start = fmt(startDate);
    end = fmt(endDate);
    financialYear = getFinancialYear(now);
  }

  const params: Record<string, unknown> = { start, end, batchId: batchId ?? null };
  const feeFilter = batchId ? 'AND ft.batch_id = :batchId' : '';
  const expenseFilter = batchId ? 'AND e.batch_id = :batchId' : '';

  const monthlyFees = await query<RowDataPacket[]>(
    `SELECT DATE_FORMAT(ft.payment_date, '%Y-%m') AS month,
            COALESCE(SUM(ft.amount), 0) AS total
     FROM fee_transactions ft
     WHERE ft.deleted_at IS NULL
       AND ft.payment_date BETWEEN :start AND :end
       ${feeFilter}
     GROUP BY DATE_FORMAT(ft.payment_date, '%Y-%m')
     ORDER BY month`,
    params
  );

  const monthlyExpenses = await query<RowDataPacket[]>(
    `SELECT DATE_FORMAT(e.expense_date, '%Y-%m') AS month,
            COALESCE(SUM(e.amount), 0) AS total
     FROM expenses e
     WHERE e.deleted_at IS NULL
       AND e.expense_date BETWEEN :start AND :end
       ${expenseFilter}
     GROUP BY DATE_FORMAT(e.expense_date, '%Y-%m')
     ORDER BY month`,
    params
  );

  const monthlyStudents = await query<RowDataPacket[]>(
    `SELECT DATE_FORMAT(s.created_at, '%Y-%m') AS month,
            COUNT(*) AS total
     FROM students s
     WHERE s.deleted_at IS NULL
       AND s.created_at BETWEEN :start AND DATE_ADD(:end, INTERVAL 1 DAY)
       ${batchId ? 'AND s.batch_id = :batchId' : ''}
     GROUP BY DATE_FORMAT(s.created_at, '%Y-%m')
     ORDER BY month`,
    params
  );

  const productSales = await query<RowDataPacket[]>(
    `SELECT DATE_FORMAT(sp.purchase_date, '%Y-%m') AS month,
            COALESCE(SUM(sp.total_amount), 0) AS total,
            COALESCE(SUM(sp.quantity), 0) AS quantity
     FROM student_products sp
     WHERE sp.deleted_at IS NULL
       AND sp.purchase_date BETWEEN :start AND :end
     GROUP BY DATE_FORMAT(sp.purchase_date, '%Y-%m')
     ORDER BY month`,
    params
  );

  const feeMap = Object.fromEntries(monthlyFees.map((r) => [r.month, Number(r.total)]));
  const expMap = Object.fromEntries(monthlyExpenses.map((r) => [r.month, Number(r.total)]));
  const studentMap = Object.fromEntries(monthlyStudents.map((r) => [r.month, Number(r.total)]));
  const salesMap = Object.fromEntries(
    productSales.map((r) => [r.month, { total: Number(r.total), quantity: Number(r.quantity) }])
  );

  // Continuous months so Recharts always has points to draw
  const months = monthRange(start, end);

  return {
    financial_year: financialYear,
    range: { start, end },
    monthly_fees: months.map((month) => ({ month, total: feeMap[month] || 0 })),
    monthly_expenses: months.map((month) => ({ month, total: expMap[month] || 0 })),
    profit: months.map((month) => ({
      month,
      fees: feeMap[month] || 0,
      expenses: expMap[month] || 0,
      profit: (feeMap[month] || 0) - (expMap[month] || 0),
    })),
    students: months.map((month) => ({ month, total: studentMap[month] || 0 })),
    product_sales: months.map((month) => ({
      month,
      total: salesMap[month]?.total || 0,
      quantity: salesMap[month]?.quantity || 0,
    })),
  };
}

export async function getBatchProfit(batchId: number) {
  const row = await queryOne<RowDataPacket>(
    `SELECT * FROM vw_batch_summary WHERE id = :batchId`,
    { batchId }
  );
  return row;
}

export async function getFyProfit(fy?: string) {
  const { start, end, fy: financialYear } = getCurrentFyBounds(fy);

  const fees = await queryOne<RowDataPacket>(
    `SELECT COALESCE(SUM(fees_committed), 0) AS committed,
            COALESCE(SUM(fees_paid), 0) AS collected
     FROM students WHERE deleted_at IS NULL`
  );

  const expenses = await queryOne<RowDataPacket>(
    `SELECT COALESCE(SUM(amount), 0) AS total
     FROM expenses
     WHERE deleted_at IS NULL AND expense_date BETWEEN :start AND :end`,
    { start, end }
  );

  const committed = Number(fees?.committed ?? 0);
  const collected = Number(fees?.collected ?? 0);
  const expenseTotal = Number(expenses?.total ?? 0);

  return {
    financial_year: financialYear,
    fees_committed: committed,
    fees_collected: collected,
    expenses: expenseTotal,
    profit_on_committed: committed - expenseTotal,
    profit_on_collected: collected - expenseTotal,
  };
}

export { getFinancialYear };
