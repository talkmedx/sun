-- ============================================================================
-- Komal's Makeovers Management Tool
-- MySQL 8 Complete Database Schema
-- Compatible with MySQL Workbench
-- ============================================================================

CREATE DATABASE IF NOT EXISTS komals_makeovers
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE komals_makeovers;

SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================================
-- USERS (Admin / Staff)
-- ============================================================================
DROP TABLE IF EXISTS users;
CREATE TABLE users (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name            VARCHAR(150)    NOT NULL,
  email           VARCHAR(191)    NOT NULL,
  phone           VARCHAR(20)     NULL,
  password_hash   VARCHAR(255)    NOT NULL,
  role            ENUM('super_admin','admin','staff') NOT NULL DEFAULT 'admin',
  avatar_url      VARCHAR(500)    NULL,
  is_active       TINYINT(1)      NOT NULL DEFAULT 1,
  refresh_token   TEXT            NULL,
  reset_token     VARCHAR(255)    NULL,
  reset_token_expires DATETIME    NULL,
  last_login_at   DATETIME        NULL,
  created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at      DATETIME        NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_role (role),
  KEY idx_users_deleted (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- BATCHES
-- ============================================================================
DROP TABLE IF EXISTS batches;
CREATE TABLE batches (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name            VARCHAR(150)    NOT NULL,
  description     TEXT            NULL,
  course_fee      DECIMAL(12,2)   NOT NULL DEFAULT 0.00,
  offer_fee       DECIMAL(12,2)   NULL COMMENT 'Discounted fee if offer active',
  start_date      DATE            NULL,
  end_date        DATE            NULL,
  status          ENUM('upcoming','ongoing','completed','cancelled') NOT NULL DEFAULT 'upcoming',
  max_students    INT UNSIGNED    NULL,
  notes           TEXT            NULL,
  created_by      BIGINT UNSIGNED NULL,
  created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at      DATETIME        NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_batches_name (name),
  KEY idx_batches_status (status),
  KEY idx_batches_dates (start_date, end_date),
  KEY idx_batches_deleted (deleted_at),
  CONSTRAINT fk_batches_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- STUDENTS
-- ============================================================================
DROP TABLE IF EXISTS students;
CREATE TABLE students (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  student_code    VARCHAR(50)     NULL,
  first_name      VARCHAR(100)    NOT NULL,
  last_name       VARCHAR(100)    NULL,
  email           VARCHAR(191)    NULL,
  phone           VARCHAR(20)     NOT NULL,
  alternate_phone VARCHAR(20)     NULL,
  date_of_birth   DATE            NULL,
  gender          ENUM('female','male','other') NULL,
  address_line1   VARCHAR(255)    NULL,
  address_line2   VARCHAR(255)    NULL,
  city            VARCHAR(100)    NULL,
  state           VARCHAR(100)    NULL,
  pincode         VARCHAR(20)     NULL,
  photo_url       VARCHAR(500)    NULL,
  batch_id        BIGINT UNSIGNED NULL,
  admission_id    BIGINT UNSIGNED NULL,
  fees_committed  DECIMAL(12,2)   NOT NULL DEFAULT 0.00,
  fees_paid       DECIMAL(12,2)   NOT NULL DEFAULT 0.00,
  status          ENUM('active','inactive','completed','dropped') NOT NULL DEFAULT 'active',
  notes           TEXT            NULL,
  created_by      BIGINT UNSIGNED NULL,
  created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at      DATETIME        NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_students_code (student_code),
  UNIQUE KEY uq_students_phone (phone),
  KEY idx_students_batch (batch_id),
  KEY idx_students_email (email),
  KEY idx_students_status (status),
  KEY idx_students_name (first_name, last_name),
  KEY idx_students_deleted (deleted_at),
  CONSTRAINT fk_students_batch FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE RESTRICT,
  CONSTRAINT fk_students_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- ADMISSIONS (Public form submissions)
-- ============================================================================
DROP TABLE IF EXISTS admissions;
CREATE TABLE admissions (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  first_name      VARCHAR(100)    NOT NULL,
  last_name       VARCHAR(100)    NULL,
  email           VARCHAR(191)    NULL,
  phone           VARCHAR(20)     NOT NULL,
  date_of_birth   DATE            NULL,
  gender          ENUM('female','male','other') NULL,
  address_line1   VARCHAR(255)    NULL,
  address_line2   VARCHAR(255)    NULL,
  city            VARCHAR(100)    NULL,
  state           VARCHAR(100)    NULL,
  pincode         VARCHAR(20)     NULL,
  photo_url       VARCHAR(500)    NULL,
  proof_url       VARCHAR(500)    NULL,
  batch_id        BIGINT UNSIGNED NULL,
  preferred_batch_note VARCHAR(255) NULL,
  status          ENUM('pending','approved','rejected','edit_requested') NOT NULL DEFAULT 'pending',
  rejection_reason TEXT           NULL,
  edit_token      VARCHAR(255)    NULL,
  edit_token_expires DATETIME     NULL,
  student_id      BIGINT UNSIGNED NULL COMMENT 'Set when approved',
  reviewed_by     BIGINT UNSIGNED NULL,
  reviewed_at     DATETIME        NULL,
  created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at      DATETIME        NULL,
  PRIMARY KEY (id),
  KEY idx_admissions_status (status),
  KEY idx_admissions_phone (phone),
  KEY idx_admissions_batch (batch_id),
  KEY idx_admissions_edit_token (edit_token),
  KEY idx_admissions_deleted (deleted_at),
  CONSTRAINT fk_admissions_batch FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE SET NULL,
  CONSTRAINT fk_admissions_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE SET NULL,
  CONSTRAINT fk_admissions_reviewed_by FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add FK from students to admissions after both exist
ALTER TABLE students
  ADD CONSTRAINT fk_students_admission
  FOREIGN KEY (admission_id) REFERENCES admissions(id) ON DELETE SET NULL;

-- ============================================================================
-- FEE TRANSACTIONS
-- ============================================================================
DROP TABLE IF EXISTS fee_transactions;
CREATE TABLE fee_transactions (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  student_id      BIGINT UNSIGNED NOT NULL,
  batch_id        BIGINT UNSIGNED NULL,
  amount          DECIMAL(12,2)   NOT NULL,
  payment_mode    ENUM('cash','upi','card','bank_transfer','cheque','other') NOT NULL DEFAULT 'upi',
  payment_date    DATE            NOT NULL,
  screenshot_url  VARCHAR(500)    NULL,
  reference_no    VARCHAR(100)    NULL,
  notes           TEXT            NULL,
  financial_year  VARCHAR(9)      NULL COMMENT 'e.g. 2025-2026',
  recorded_by     BIGINT UNSIGNED NULL,
  created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at      DATETIME        NULL,
  PRIMARY KEY (id),
  KEY idx_fee_student (student_id),
  KEY idx_fee_batch (batch_id),
  KEY idx_fee_date (payment_date),
  KEY idx_fee_fy (financial_year),
  KEY idx_fee_deleted (deleted_at),
  CONSTRAINT fk_fee_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE RESTRICT,
  CONSTRAINT fk_fee_batch FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE SET NULL,
  CONSTRAINT fk_fee_recorded_by FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT chk_fee_amount CHECK (amount > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- VENDORS
-- ============================================================================
DROP TABLE IF EXISTS vendors;
CREATE TABLE vendors (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name            VARCHAR(200)    NOT NULL,
  contact_person  VARCHAR(150)    NULL,
  email           VARCHAR(191)    NULL,
  phone           VARCHAR(20)     NOT NULL,
  alternate_phone VARCHAR(20)     NULL,
  address         TEXT            NULL,
  city            VARCHAR(100)    NULL,
  state           VARCHAR(100)    NULL,
  pincode         VARCHAR(20)     NULL,
  gstin           VARCHAR(30)     NULL,
  pending_credit  DECIMAL(12,2)   NOT NULL DEFAULT 0.00,
  notes           TEXT            NULL,
  is_active       TINYINT(1)      NOT NULL DEFAULT 1,
  created_by      BIGINT UNSIGNED NULL,
  created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at      DATETIME        NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_vendors_name (name),
  UNIQUE KEY uq_vendors_phone (phone),
  KEY idx_vendors_active (is_active),
  KEY idx_vendors_deleted (deleted_at),
  CONSTRAINT fk_vendors_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- VENDOR CREDITS
-- ============================================================================
DROP TABLE IF EXISTS vendor_credits;
CREATE TABLE vendor_credits (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  vendor_id       BIGINT UNSIGNED NOT NULL,
  amount          DECIMAL(12,2)   NOT NULL,
  type            ENUM('credit_added','credit_used','adjustment') NOT NULL,
  expense_id      BIGINT UNSIGNED NULL COMMENT 'Linked expense when credit reduced',
  description     VARCHAR(500)    NULL,
  bill_url        VARCHAR(500)    NULL,
  transaction_date DATE           NOT NULL,
  recorded_by     BIGINT UNSIGNED NULL,
  created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at      DATETIME        NULL,
  PRIMARY KEY (id),
  KEY idx_vc_vendor (vendor_id),
  KEY idx_vc_type (type),
  KEY idx_vc_date (transaction_date),
  KEY idx_vc_deleted (deleted_at),
  CONSTRAINT fk_vc_vendor FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE RESTRICT,
  CONSTRAINT fk_vc_recorded_by FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT chk_vc_amount CHECK (amount > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- EXPENSES
-- ============================================================================
DROP TABLE IF EXISTS expenses;
CREATE TABLE expenses (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  title           VARCHAR(255)    NOT NULL,
  description     TEXT            NULL,
  amount          DECIMAL(12,2)   NOT NULL,
  category        VARCHAR(100)    NULL,
  batch_id        BIGINT UNSIGNED NULL,
  vendor_id       BIGINT UNSIGNED NULL,
  expense_date    DATE            NOT NULL,
  payment_mode    ENUM('cash','upi','card','bank_transfer','cheque','vendor_credit','other') NOT NULL DEFAULT 'cash',
  use_vendor_credit TINYINT(1)    NOT NULL DEFAULT 0,
  screenshot_url  VARCHAR(500)    NULL,
  bill_url        VARCHAR(500)    NULL,
  financial_year  VARCHAR(9)      NULL,
  recorded_by     BIGINT UNSIGNED NULL,
  created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at      DATETIME        NULL,
  PRIMARY KEY (id),
  KEY idx_expenses_batch (batch_id),
  KEY idx_expenses_vendor (vendor_id),
  KEY idx_expenses_date (expense_date),
  KEY idx_expenses_fy (financial_year),
  KEY idx_expenses_category (category),
  KEY idx_expenses_deleted (deleted_at),
  CONSTRAINT fk_expenses_batch FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE SET NULL,
  CONSTRAINT fk_expenses_vendor FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE SET NULL,
  CONSTRAINT fk_expenses_recorded_by FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT chk_expense_amount CHECK (amount > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Link vendor_credits.expense_id after expenses table exists
ALTER TABLE vendor_credits
  ADD CONSTRAINT fk_vc_expense
  FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE SET NULL;

-- ============================================================================
-- PRODUCTS
-- ============================================================================
DROP TABLE IF EXISTS products;
CREATE TABLE products (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  sku             VARCHAR(50)     NULL,
  name            VARCHAR(200)    NOT NULL,
  description     TEXT            NULL,
  vendor_id       BIGINT UNSIGNED NULL,
  cost_price      DECIMAL(12,2)   NOT NULL DEFAULT 0.00,
  selling_price   DECIMAL(12,2)   NOT NULL DEFAULT 0.00,
  profit_percent  DECIMAL(8,2)    GENERATED ALWAYS AS (
    CASE WHEN cost_price > 0 THEN ROUND(((selling_price - cost_price) / cost_price) * 100, 2) ELSE 0 END
  ) STORED,
  quantity_available INT          NOT NULL DEFAULT 0,
  quantity_sold   INT             NOT NULL DEFAULT 0,
  low_stock_threshold INT         NOT NULL DEFAULT 5,
  image_url       VARCHAR(500)    NULL,
  is_active       TINYINT(1)      NOT NULL DEFAULT 1,
  created_by      BIGINT UNSIGNED NULL,
  created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at      DATETIME        NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_products_sku (sku),
  UNIQUE KEY uq_products_name (name),
  KEY idx_products_vendor (vendor_id),
  KEY idx_products_active (is_active),
  KEY idx_products_deleted (deleted_at),
  CONSTRAINT fk_products_vendor FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE SET NULL,
  CONSTRAINT fk_products_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT chk_products_qty CHECK (quantity_available >= 0),
  CONSTRAINT chk_products_sold CHECK (quantity_sold >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- PRODUCT PRICE HISTORY (immutable historical pricing)
-- ============================================================================
DROP TABLE IF EXISTS product_price_history;
CREATE TABLE product_price_history (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  product_id      BIGINT UNSIGNED NOT NULL,
  cost_price      DECIMAL(12,2)   NOT NULL,
  selling_price   DECIMAL(12,2)   NOT NULL,
  effective_from  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  effective_to    DATETIME        NULL COMMENT 'NULL = current price',
  changed_by      BIGINT UNSIGNED NULL,
  change_reason   VARCHAR(255)    NULL,
  created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at      DATETIME        NULL,
  PRIMARY KEY (id),
  KEY idx_pph_product (product_id),
  KEY idx_pph_effective (product_id, effective_from, effective_to),
  CONSTRAINT fk_pph_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT fk_pph_changed_by FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- STUDENT PRODUCTS (purchases with frozen historical prices)
-- ============================================================================
DROP TABLE IF EXISTS student_products;
CREATE TABLE student_products (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  student_id      BIGINT UNSIGNED NOT NULL,
  product_id      BIGINT UNSIGNED NOT NULL,
  price_history_id BIGINT UNSIGNED NULL COMMENT 'Locks the price at sale time',
  quantity        INT             NOT NULL DEFAULT 1,
  unit_cost_price DECIMAL(12,2)   NOT NULL COMMENT 'Frozen at purchase',
  unit_selling_price DECIMAL(12,2) NOT NULL COMMENT 'Frozen at purchase',
  total_amount    DECIMAL(12,2)   NOT NULL,
  purchase_date   DATE            NOT NULL,
  payment_mode    ENUM('cash','upi','card','bank_transfer','cheque','other') NOT NULL DEFAULT 'cash',
  notes           TEXT            NULL,
  recorded_by     BIGINT UNSIGNED NULL,
  created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at      DATETIME        NULL,
  PRIMARY KEY (id),
  KEY idx_sp_student (student_id),
  KEY idx_sp_product (product_id),
  KEY idx_sp_date (purchase_date),
  KEY idx_sp_deleted (deleted_at),
  CONSTRAINT fk_sp_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE RESTRICT,
  CONSTRAINT fk_sp_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
  CONSTRAINT fk_sp_price_history FOREIGN KEY (price_history_id) REFERENCES product_price_history(id) ON DELETE SET NULL,
  CONSTRAINT fk_sp_recorded_by FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT chk_sp_qty CHECK (quantity > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- DOCUMENTS
-- ============================================================================
DROP TABLE IF EXISTS documents;
CREATE TABLE documents (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  entity_type     ENUM('student','vendor','expense','admission','batch','other') NOT NULL,
  entity_id       BIGINT UNSIGNED NOT NULL,
  title           VARCHAR(255)    NOT NULL,
  file_url        VARCHAR(500)    NOT NULL,
  file_type       VARCHAR(50)     NULL,
  file_size       INT UNSIGNED    NULL COMMENT 'bytes',
  uploaded_by     BIGINT UNSIGNED NULL,
  created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at      DATETIME        NULL,
  PRIMARY KEY (id),
  KEY idx_docs_entity (entity_type, entity_id),
  KEY idx_docs_deleted (deleted_at),
  CONSTRAINT fk_docs_uploaded_by FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- NOTIFICATIONS
-- ============================================================================
DROP TABLE IF EXISTS notifications;
CREATE TABLE notifications (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id         BIGINT UNSIGNED NULL COMMENT 'NULL = all admins',
  title           VARCHAR(255)    NOT NULL,
  message         TEXT            NOT NULL,
  type            ENUM('info','success','warning','error','admission','payment','stock') NOT NULL DEFAULT 'info',
  link            VARCHAR(500)    NULL,
  is_read         TINYINT(1)      NOT NULL DEFAULT 0,
  read_at         DATETIME        NULL,
  meta_json       JSON            NULL,
  created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at      DATETIME        NULL,
  PRIMARY KEY (id),
  KEY idx_notif_user (user_id),
  KEY idx_notif_read (is_read),
  KEY idx_notif_type (type),
  KEY idx_notif_deleted (deleted_at),
  CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- SETTINGS
-- ============================================================================
DROP TABLE IF EXISTS settings;
CREATE TABLE settings (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  setting_key     VARCHAR(100)    NOT NULL,
  setting_value   TEXT            NULL,
  value_type      ENUM('string','number','boolean','json') NOT NULL DEFAULT 'string',
  description     VARCHAR(255)    NULL,
  created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at      DATETIME        NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_settings_key (setting_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================================
-- VIEWS for Dashboard / Reports
-- ============================================================================

CREATE OR REPLACE VIEW vw_batch_summary AS
SELECT
  b.id,
  b.name,
  b.course_fee,
  b.offer_fee,
  COALESCE(b.offer_fee, b.course_fee) AS effective_fee,
  b.start_date,
  b.end_date,
  b.status,
  COUNT(DISTINCT s.id) AS student_count,
  COALESCE(SUM(s.fees_committed), 0) AS total_fees_committed,
  COALESCE(SUM(s.fees_paid), 0) AS total_fees_collected,
  COALESCE((
    SELECT SUM(e.amount) FROM expenses e
    WHERE e.batch_id = b.id AND e.deleted_at IS NULL
  ), 0) AS total_expenses,
  (
    COALESCE(SUM(s.fees_committed), 0) - COALESCE((
      SELECT SUM(e.amount) FROM expenses e
      WHERE e.batch_id = b.id AND e.deleted_at IS NULL
    ), 0)
  ) AS batch_profit
FROM batches b
LEFT JOIN students s ON s.batch_id = b.id AND s.deleted_at IS NULL
WHERE b.deleted_at IS NULL
GROUP BY b.id;

CREATE OR REPLACE VIEW vw_product_stock AS
SELECT
  p.id,
  p.sku,
  p.name,
  p.cost_price,
  p.selling_price,
  p.profit_percent,
  p.quantity_available,
  p.quantity_sold,
  (p.quantity_available * p.cost_price) AS stock_value,
  (p.quantity_sold * (p.selling_price - p.cost_price)) AS estimated_profit,
  v.name AS vendor_name,
  p.is_active
FROM products p
LEFT JOIN vendors v ON v.id = p.vendor_id AND v.deleted_at IS NULL
WHERE p.deleted_at IS NULL;
