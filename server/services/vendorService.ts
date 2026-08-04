import { RowDataPacket } from 'mysql2';
import { query, queryOne, execute } from '../config/database';
import { NotFoundError, ConflictError, AppError } from '../utils/errors';
import { paginate, likePattern } from '../helpers/queryHelpers';
import { normalizePhone } from '../helpers/generators';

interface ListParams {
  page?: number;
  limit?: number;
  search?: string;
}

export async function listVendors(params: ListParams) {
  const { page, limit, offset } = paginate(params.page, params.limit);
  const conditions = ['v.deleted_at IS NULL'];
  const q: Record<string, unknown> = {};

  if (params.search) {
    conditions.push('(v.name LIKE :search OR v.phone LIKE :search OR v.contact_person LIKE :search)');
    q.search = likePattern(params.search);
  }

  const where = conditions.join(' AND ');
  const countRow = await queryOne<RowDataPacket>(
    `SELECT COUNT(*) AS total FROM vendors v WHERE ${where}`,
    q
  );

  const rows = await query<RowDataPacket[]>(
    `SELECT v.* FROM vendors v WHERE ${where}
     ORDER BY v.name ASC LIMIT ${limit} OFFSET ${offset}`,
    q
  );

  const total = Number(countRow?.total ?? 0);
  return { rows, meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 } };
}

export async function getVendor(id: number) {
  const vendor = await queryOne<RowDataPacket>(
    `SELECT * FROM vendors WHERE id = :id AND deleted_at IS NULL`,
    { id }
  );
  if (!vendor) throw new NotFoundError('Vendor');
  return vendor;
}

export async function createVendor(data: Record<string, unknown>, userId: number) {
  const phone = normalizePhone(String(data.phone));

  const dupName = await queryOne<RowDataPacket>(
    `SELECT id FROM vendors WHERE name = :name AND deleted_at IS NULL`,
    { name: data.name }
  );
  if (dupName) throw new ConflictError('Vendor with this name already exists');

  const dupPhone = await queryOne<RowDataPacket>(
    `SELECT id FROM vendors WHERE phone = :phone AND deleted_at IS NULL`,
    { phone }
  );
  if (dupPhone) throw new ConflictError('Vendor with this phone already exists');

  const result = await execute(
    `INSERT INTO vendors
      (name, contact_person, email, phone, alternate_phone, address, city, state, pincode, gstin, notes, created_by)
     VALUES
      (:name, :contact_person, :email, :phone, :alternate_phone, :address, :city, :state, :pincode, :gstin, :notes, :created_by)`,
    {
      name: data.name,
      contact_person: data.contact_person || null,
      email: data.email || null,
      phone,
      alternate_phone: data.alternate_phone || null,
      address: data.address || null,
      city: data.city || null,
      state: data.state || null,
      pincode: data.pincode || null,
      gstin: data.gstin || null,
      notes: data.notes || null,
      created_by: userId,
    }
  );

  return getVendor(result.insertId);
}

export async function updateVendor(id: number, data: Record<string, unknown>) {
  await getVendor(id);

  if (data.name) {
    const dup = await queryOne<RowDataPacket>(
      `SELECT id FROM vendors WHERE name = :name AND id != :id AND deleted_at IS NULL`,
      { name: data.name, id }
    );
    if (dup) throw new ConflictError('Vendor with this name already exists');
  }
  if (data.phone) {
    data.phone = normalizePhone(String(data.phone));
    const dup = await queryOne<RowDataPacket>(
      `SELECT id FROM vendors WHERE phone = :phone AND id != :id AND deleted_at IS NULL`,
      { phone: data.phone, id }
    );
    if (dup) throw new ConflictError('Vendor with this phone already exists');
  }

  const fields = [
    'name', 'contact_person', 'email', 'phone', 'alternate_phone', 'address',
    'city', 'state', 'pincode', 'gstin', 'notes', 'is_active',
  ];
  const sets: string[] = [];
  const params: Record<string, unknown> = { id };

  for (const f of fields) {
    if (data[f] !== undefined) {
      sets.push(`${f} = :${f}`);
      params[f] = typeof data[f] === 'boolean' ? (data[f] ? 1 : 0) : data[f] === '' ? null : data[f];
    }
  }

  if (sets.length) {
    await execute(`UPDATE vendors SET ${sets.join(', ')} WHERE id = :id`, params);
  }
  return getVendor(id);
}

export async function deleteVendor(id: number) {
  const vendor = await getVendor(id);
  if (Number(vendor.pending_credit) > 0) {
    throw new AppError('Cannot delete vendor with pending credits', 400);
  }
  await execute(`UPDATE vendors SET deleted_at = NOW() WHERE id = :id`, { id });
}

export async function listCredits(vendorId: number) {
  await getVendor(vendorId);
  return query<RowDataPacket[]>(
    `SELECT * FROM vendor_credits
     WHERE vendor_id = :vendorId AND deleted_at IS NULL
     ORDER BY transaction_date DESC, id DESC`,
    { vendorId }
  );
}

export async function addCredit(
  vendorId: number,
  data: Record<string, unknown>,
  userId: number,
  billUrl?: string
) {
  await getVendor(vendorId);
  const amount = Number(data.amount);

  await execute(
    `UPDATE vendors SET pending_credit = pending_credit + :amount WHERE id = :id`,
    { amount, id: vendorId }
  );

  const result = await execute(
    `INSERT INTO vendor_credits
      (vendor_id, amount, type, description, bill_url, transaction_date, recorded_by)
     VALUES (:vendorId, :amount, 'credit_added', :description, :billUrl, :transaction_date, :userId)`,
    {
      vendorId,
      amount,
      description: data.description || null,
      billUrl: billUrl || null,
      transaction_date: data.transaction_date,
      userId,
    }
  );

  return queryOne<RowDataPacket>(`SELECT * FROM vendor_credits WHERE id = :id`, {
    id: result.insertId,
  });
}

export async function listVendorExpenses(vendorId: number) {
  await getVendor(vendorId);
  return query<RowDataPacket[]>(
    `SELECT e.*, b.name AS batch_name FROM expenses e
     LEFT JOIN batches b ON b.id = e.batch_id
     WHERE e.vendor_id = :vendorId AND e.deleted_at IS NULL
     ORDER BY e.expense_date DESC`,
    { vendorId }
  );
}
