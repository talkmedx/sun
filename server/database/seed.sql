-- ============================================================================
-- Sample / Seed Data for Komal's Makeovers Management Tool
-- Run AFTER schema.sql
-- Default admin password: Admin@123 (bcrypt hashed)
-- ============================================================================

CREATE DATABASE IF NOT EXISTS komals_makeovers
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE komals_makeovers;

-- Admin user (password: Admin@123)
INSERT INTO users (name, email, phone, password_hash, role, is_active) VALUES
('Komal Admin', 'admin@komalsmakeovers.com', '9876543210',
 '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.G2oQ.Y5zqKzqKq', 'super_admin', 1);

-- Note: The hash above is a placeholder. On first server boot, seed script
-- will upsert a proper bcrypt hash for Admin@123.

INSERT INTO settings (setting_key, setting_value, value_type, description) VALUES
('business_name', 'Komal''s Makeovers', 'string', 'Business display name'),
('financial_year_start_month', '4', 'number', 'FY starts in April (India)'),
('currency', 'INR', 'string', 'Default currency'),
('currency_symbol', '₹', 'string', 'Currency symbol'),
('max_upload_size_mb', '5', 'number', 'Max file upload size in MB'),
('low_stock_alert', 'true', 'boolean', 'Enable low stock notifications'),
('admission_public_enabled', 'true', 'boolean', 'Enable public admission form'),
('theme_default', 'light', 'string', 'Default UI theme');

INSERT INTO batches (name, description, course_fee, offer_fee, start_date, end_date, status, max_students, created_by) VALUES
('Bridal Makeup Batch A', 'Complete bridal makeup course', 45000.00, 39999.00, '2025-04-01', '2025-06-30', 'completed', 15, 1),
('Professional Makeup Batch B', 'Professional makeup artist training', 55000.00, NULL, '2025-07-01', '2025-09-30', 'ongoing', 20, 1),
('Hair Styling Batch C', 'Advanced hair styling & coloring', 35000.00, 32000.00, '2025-10-01', '2025-12-15', 'upcoming', 12, 1),
('Nail Art Batch D', 'Nail art and extensions course', 25000.00, NULL, '2026-01-15', '2026-03-15', 'upcoming', 10, 1);

INSERT INTO vendors (name, contact_person, email, phone, city, state, pending_credit, created_by) VALUES
('Beauty Supplies Co', 'Ravi Sharma', 'ravi@beautysupplies.com', '9811111111', 'Mumbai', 'Maharashtra', 15000.00, 1),
('Glam Cosmetics Wholesale', 'Priya Mehta', 'priya@glamcosmetics.com', '9822222222', 'Pune', 'Maharashtra', 8500.00, 1),
('Pro Makeup Tools', 'Amit Patel', 'amit@promakeup.com', '9833333333', 'Ahmedabad', 'Gujarat', 0.00, 1);

INSERT INTO students (student_code, first_name, last_name, email, phone, city, state, batch_id, fees_committed, fees_paid, status, created_by) VALUES
('KM-2025-001', 'Ananya', 'Sharma', 'ananya@email.com', '9900110011', 'Mumbai', 'Maharashtra', 1, 39999.00, 39999.00, 'completed', 1),
('KM-2025-002', 'Sneha', 'Patil', 'sneha@email.com', '9900110012', 'Thane', 'Maharashtra', 1, 39999.00, 35000.00, 'completed', 1),
('KM-2025-003', 'Riya', 'Kapoor', 'riya@email.com', '9900110013', 'Mumbai', 'Maharashtra', 2, 55000.00, 30000.00, 'active', 1),
('KM-2025-004', 'Pooja', 'Desai', 'pooja@email.com', '9900110014', 'Pune', 'Maharashtra', 2, 55000.00, 55000.00, 'active', 1),
('KM-2025-005', 'Meera', 'Joshi', 'meera@email.com', '9900110015', 'Nashik', 'Maharashtra', 2, 55000.00, 20000.00, 'active', 1);

INSERT INTO fee_transactions (student_id, batch_id, amount, payment_mode, payment_date, financial_year, recorded_by) VALUES
(1, 1, 20000.00, 'upi', '2025-04-05', '2025-2026', 1),
(1, 1, 19999.00, 'cash', '2025-05-10', '2025-2026', 1),
(2, 1, 20000.00, 'upi', '2025-04-08', '2025-2026', 1),
(2, 1, 15000.00, 'bank_transfer', '2025-05-15', '2025-2026', 1),
(3, 2, 30000.00, 'upi', '2025-07-05', '2025-2026', 1),
(4, 2, 27500.00, 'card', '2025-07-02', '2025-2026', 1),
(4, 2, 27500.00, 'upi', '2025-08-01', '2025-2026', 1),
(5, 2, 20000.00, 'cash', '2025-07-10', '2025-2026', 1);

INSERT INTO expenses (title, description, amount, category, batch_id, vendor_id, expense_date, payment_mode, use_vendor_credit, financial_year, recorded_by) VALUES
('Makeup Kits Purchase', 'Student kits for Batch A', 25000.00, 'Materials', 1, 1, '2025-04-02', 'vendor_credit', 1, '2025-2026', 1),
('Studio Rent', 'April rent', 15000.00, 'Rent', NULL, NULL, '2025-04-01', 'bank_transfer', 0, '2025-2026', 1),
('Cosmetics Restock', 'Foundation & lipstick stock', 12000.00, 'Inventory', 2, 2, '2025-07-01', 'upi', 0, '2025-2026', 1),
('Marketing Flyers', 'Batch B promotion', 3500.00, 'Marketing', 2, NULL, '2025-06-20', 'cash', 0, '2025-2026', 1),
('Studio Rent', 'July rent', 15000.00, 'Rent', NULL, NULL, '2025-07-01', 'bank_transfer', 0, '2025-2026', 1);

INSERT INTO vendor_credits (vendor_id, amount, type, expense_id, description, transaction_date, recorded_by) VALUES
(1, 40000.00, 'credit_added', NULL, 'Initial credit / advance', '2025-03-15', 1),
(1, 25000.00, 'credit_used', 1, 'Makeup kits for Batch A', '2025-04-02', 1),
(2, 8500.00, 'credit_added', NULL, 'Advance payment', '2025-06-01', 1);

INSERT INTO products (sku, name, description, vendor_id, cost_price, selling_price, quantity_available, quantity_sold, created_by) VALUES
('PRD-001', 'HD Foundation Kit', 'Professional HD foundation set', 1, 800.00, 1200.00, 45, 5, 1),
('PRD-002', 'Bridal Lipstick Set', 'Long-lasting bridal lipstick pack', 2, 450.00, 750.00, 30, 10, 1),
('PRD-003', 'Makeup Brush Set Pro', '12-piece professional brush set', 3, 1200.00, 1999.00, 20, 3, 1),
('PRD-004', 'Setting Spray', 'Long wear setting spray 100ml', 1, 250.00, 450.00, 60, 15, 1),
('PRD-005', 'Contour Palette', 'Cream contour & highlight palette', 2, 600.00, 999.00, 25, 0, 1);

INSERT INTO product_price_history (product_id, cost_price, selling_price, effective_from, effective_to, changed_by, change_reason) VALUES
(1, 750.00, 1100.00, '2025-01-01 00:00:00', '2025-06-01 00:00:00', 1, 'Initial pricing'),
(1, 800.00, 1200.00, '2025-06-01 00:00:00', NULL, 1, 'Price increase'),
(2, 450.00, 750.00, '2025-01-01 00:00:00', NULL, 1, 'Initial pricing'),
(3, 1200.00, 1999.00, '2025-01-01 00:00:00', NULL, 1, 'Initial pricing'),
(4, 250.00, 450.00, '2025-01-01 00:00:00', NULL, 1, 'Initial pricing'),
(5, 600.00, 999.00, '2025-01-01 00:00:00', NULL, 1, 'Initial pricing');

INSERT INTO student_products (student_id, product_id, price_history_id, quantity, unit_cost_price, unit_selling_price, total_amount, purchase_date, payment_mode, recorded_by) VALUES
(1, 1, 1, 1, 750.00, 1100.00, 1100.00, '2025-04-10', 'cash', 1),
(1, 2, 3, 2, 450.00, 750.00, 1500.00, '2025-04-10', 'upi', 1),
(3, 1, 2, 1, 800.00, 1200.00, 1200.00, '2025-07-15', 'upi', 1),
(4, 3, 4, 1, 1200.00, 1999.00, 1999.00, '2025-07-20', 'card', 1);

INSERT INTO admissions (first_name, last_name, email, phone, city, state, batch_id, status) VALUES
('Kavya', 'Nair', 'kavya@email.com', '9900220022', 'Mumbai', 'Maharashtra', 3, 'pending'),
('Divya', 'Reddy', 'divya@email.com', '9900220023', 'Hyderabad', 'Telangana', 2, 'pending');

INSERT INTO notifications (user_id, title, message, type, link, is_read) VALUES
(NULL, 'New Admission Application', 'Kavya Nair submitted an admission form for Hair Styling Batch C', 'admission', '/admissions', 0),
(NULL, 'New Admission Application', 'Divya Reddy submitted an admission form for Professional Makeup Batch B', 'admission', '/admissions', 0),
(1, 'Pending Fees Alert', '3 students have pending fee balances', 'warning', '/students?filter=pending_fees', 0);
