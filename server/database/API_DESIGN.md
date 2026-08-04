# REST API Design — Komal's Makeovers Management Tool

Base URL: `http://localhost:5001/api/v1`

Auth: `Authorization: Bearer <access_token>`

---

## Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/login` | Public | Login, returns access + refresh tokens |
| POST | `/auth/refresh` | Public | Refresh access token |
| POST | `/auth/logout` | Protected | Invalidate refresh token |
| POST | `/auth/forgot-password` | Public | Send reset token |
| POST | `/auth/reset-password` | Public | Reset with token |
| POST | `/auth/change-password` | Protected | Change password |
| GET | `/auth/me` | Protected | Current user profile |

---

## Dashboard

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/dashboard/summary?batch_id=` | Summary cards data |
| GET | `/dashboard/charts?batch_id=&fy=` | Chart datasets |
| GET | `/dashboard/batch-profit/:batchId` | Batch profit detail |
| GET | `/dashboard/fy-profit?fy=` | Financial year profit |

---

## Students

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/students?page=&limit=&search=&batch_id=&sort=` | List with filters |
| GET | `/students/:id` | Student profile |
| POST | `/students` | Create student |
| PUT | `/students/:id` | Update student |
| DELETE | `/students/:id` | Soft delete |
| POST | `/students/:id/photo` | Upload photo |
| GET | `/students/:id/fees` | Fee transactions |
| POST | `/students/:id/fees` | Add fee payment |
| GET | `/students/:id/products` | Product purchases |
| POST | `/students/:id/products` | Record product sale |
| GET | `/students/:id/documents` | Documents |
| POST | `/students/:id/documents` | Upload document |

---

## Batches

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/batches` | List batches |
| GET | `/batches/:id` | Batch detail + profit |
| POST | `/batches` | Create |
| PUT | `/batches/:id` | Update |
| DELETE | `/batches/:id` | Soft delete (blocked if students) |

---

## Expenses

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/expenses?page=&search=&batch_id=&vendor_id=` | List |
| GET | `/expenses/:id` | Detail |
| POST | `/expenses` | Create (auto-reduce vendor credit) |
| PUT | `/expenses/:id` | Update |
| DELETE | `/expenses/:id` | Soft delete |
| POST | `/expenses/:id/screenshot` | Upload screenshot |

---

## Vendors

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/vendors` | List |
| GET | `/vendors/:id` | Detail |
| POST | `/vendors` | Create |
| PUT | `/vendors/:id` | Update |
| DELETE | `/vendors/:id` | Soft delete (blocked if pending credit) |
| GET | `/vendors/:id/credits` | Credit history |
| POST | `/vendors/:id/credits` | Add credit |
| GET | `/vendors/:id/expenses` | Expense history |
| POST | `/vendors/:id/bills` | Upload bill |

---

## Products

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/products?page=&search=` | Inventory list |
| GET | `/products/:id` | Detail |
| POST | `/products` | Create (+ initial price history) |
| PUT | `/products/:id` | Update (price change → new history row) |
| DELETE | `/products/:id` | Soft delete (blocked if sold) |
| GET | `/products/:id/price-history` | Price history |
| POST | `/products/:id/stock` | Adjust stock |

---

## Admissions

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/admissions` | Public submit |
| GET | `/admissions` | Admin list |
| GET | `/admissions/:id` | Detail |
| POST | `/admissions/:id/approve` | Approve → create student |
| POST | `/admissions/:id/reject` | Reject |
| POST | `/admissions/:id/edit-link` | Generate one-time edit link |
| GET | `/admissions/edit/:token` | Public get for edit |
| PUT | `/admissions/edit/:token` | Public update via token |

---

## Reports

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/reports/students` | Student report |
| GET | `/reports/fees` | Fee report |
| GET | `/reports/expenses` | Expense report |
| GET | `/reports/vendors` | Vendor report |
| GET | `/reports/batches` | Batch report |
| GET | `/reports/inventory` | Inventory report |
| GET | `/reports/profit` | Profit report |
| GET | `/reports/export/:type?format=xlsx\|pdf` | Export |

---

## Notifications

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/notifications` | List |
| PATCH | `/notifications/:id/read` | Mark read |
| PATCH | `/notifications/read-all` | Mark all read |
| DELETE | `/notifications/:id` | Soft delete |

---

## Settings / Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/settings` | Get settings |
| PUT | `/settings` | Update settings |
| GET | `/health` | Health check |

---

## Response Envelope

```json
{
  "success": true,
  "message": "OK",
  "data": {},
  "meta": { "page": 1, "limit": 20, "total": 100, "totalPages": 5 }
}
```

## Error Envelope

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [{ "field": "phone", "message": "Invalid phone number" }]
}
```
