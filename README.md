# Komal's Makeovers Management Tool

Enterprise-grade makeup academy management system — students, fees, batches, expenses, vendors, inventory, admissions & reports.

## Tech Stack

| Layer | Stack |
|-------|--------|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind, shadcn/ui, TanStack Query/Table, Zustand, Framer Motion, Recharts |
| Backend | Node.js, Express, JWT, bcrypt, Multer, Zod |
| Database | MySQL 8 via `mysql2` (connection pool, transactions, FKs) |

## Project Structure

```
komals-makeovers/
├── client/          # Next.js frontend (port 3001)
└── server/          # Express API (port 5001)
    └── database/    # schema.sql, seed.sql, ER_DIAGRAM.md, API_DESIGN.md
```

---

## Step 1–2: Database & ER Diagram

**Files:** `server/database/schema.sql`, `seed.sql`, `ER_DIAGRAM.md`

### Run in MySQL Workbench or CLI

```bash
mysql -u root -p < server/database/schema.sql
mysql -u root -p < server/database/seed.sql
```

Or open MySQL Workbench → File → Run SQL Script → select `schema.sql`, then `seed.sql`.

### Test

```sql
USE komals_makeovers;
SHOW TABLES;
SELECT * FROM vw_batch_summary;
```

ER diagram: open `server/database/ER_DIAGRAM.md` (Mermaid) in VS Code / GitHub.

---

## Step 3: REST API Design

See `server/database/API_DESIGN.md` for full endpoint list.

---

## Step 4–5: Backend Setup

```bash
cd server
cp .env.example .env   # edit DB_PASSWORD if needed
npm install
npm run dev
```

### Test

```bash
curl http://localhost:5001/api/v1/health
```

Expected: `{ "success": true, "message": "Komal's Makeovers API is healthy", ... }`

On first successful DB connect, default admin is ensured:
- **Email:** `admin@komalsmakeovers.com`
- **Password:** `Admin@123`

---

## Step 6: Authentication

```bash
# Login
curl -X POST http://localhost:5001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@komalsmakeovers.com","password":"Admin@123"}'

# Me (use accessToken from login)
curl http://localhost:5001/api/v1/auth/me \
  -H "Authorization: Bearer <accessToken>"
```

Also available: refresh, logout, forgot/reset password, change password.

---

## Step 7–15: Frontend Modules

```bash
cd client
npm install
npm run dev
```

Open **http://localhost:3001**

| Module | URL |
|--------|-----|
| Login | `/login` |
| Dashboard | `/dashboard` |
| Students | `/students` |
| Batches | `/batches` |
| Expenses | `/expenses` |
| Vendors | `/vendors` |
| Products | `/products` |
| Admissions (admin) | `/admissions` |
| Public admission | `/admission` |
| Reports | `/reports` |
| Notifications | `/notifications` |
| Settings | `/settings` |

### Business rules enforced

- Batch profit = fees committed − batch expenses  
- FY profit = fees committed − FY expenses  
- Vendor credit auto-reduces when expense uses vendor credit  
- Product price changes create history rows; sold items keep frozen prices  
- Cannot delete batch with students / product already sold / vendor with pending credit  

---

## Step 16: Quick Test Checklist

1. Login with admin credentials  
2. Dashboard summary cards + charts load  
3. Create batch → create student → record fee  
4. Create vendor → add credit → expense with vendor credit (credit decreases)  
5. Create product → sell to student → change product price → verify history + sold price unchanged  
6. Submit `/admission` form → approve in admin → student created  
7. Export report Excel/PDF  

---

## Step 17: Deployment

### Server (Node)

```bash
cd server
npm run build
NODE_ENV=production node dist/server.js
```

Use PM2 / systemd. Set strong JWT secrets and DB password in `.env`.

### Client (Next.js)

```bash
cd client
npm run build
npm start
```

Or deploy to Vercel with `NEXT_PUBLIC_API_URL` pointing to your API.

### MySQL

- Enable backups  
- Restrict remote access  
- Use connection pooling (already configured)  

### Nginx reverse proxy (example)

```
/api  → localhost:5001
/     → localhost:3001
/uploads → localhost:5001/uploads
```

---

## Default Credentials

| Field | Value |
|-------|-------|
| Email | admin@komalsmakeovers.com |
| Password | Admin@123 |

**Change immediately in production.**
