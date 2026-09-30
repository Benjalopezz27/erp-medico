-- Synthetic minimal schema (column names mirror the real migrations) + sane data.
CREATE TABLE migrations (id serial PRIMARY KEY, timestamp bigint NOT NULL, name varchar NOT NULL);
INSERT INTO migrations (timestamp, name) SELECT 1700000000000 + g, 'Mig' || g FROM generate_series(0, 31) g;
CREATE TABLE users (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text);
CREATE TABLE products (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), sku text);
CREATE TABLE stocks (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), product_id uuid, current_base_stock numeric(14,4) NOT NULL);
CREATE TABLE customers (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text);
CREATE TABLE sales (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
CREATE TABLE fiscal_documents (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
CREATE TABLE checks (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
CREATE TABLE account_receivables (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  original_amount numeric(14,2) NOT NULL, current_balance numeric(14,2) NOT NULL);
CREATE TABLE account_receivable_movements (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_receivable_id uuid NOT NULL REFERENCES account_receivables(id), movement_type varchar(50) NOT NULL,
  amount numeric(14,2) NOT NULL, previous_balance numeric(14,2) NOT NULL, subsequent_balance numeric(14,2) NOT NULL);
CREATE TABLE payments (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), total_amount numeric(14,2) NOT NULL);
CREATE TABLE payment_allocations (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL REFERENCES payments(id), amount_allocated numeric(14,2) NOT NULL);

INSERT INTO users (email) VALUES ('synthetic@example.invalid');
INSERT INTO products (sku) SELECT 'SKU-' || g FROM generate_series(1, 50) g;
INSERT INTO stocks (product_id, current_base_stock) SELECT id, 10 FROM products;
INSERT INTO customers (name) VALUES ('Cliente Sintetico');
DO $$
DECLARE ar uuid; p uuid;
BEGIN
  INSERT INTO account_receivables (original_amount, current_balance) VALUES (1000.00, 600.00) RETURNING id INTO ar;
  INSERT INTO account_receivable_movements (account_receivable_id, movement_type, amount, previous_balance, subsequent_balance)
    VALUES (ar, 'FACTURA', 1000.00, 0, 1000.00), (ar, 'PAGO', 400.00, 1000.00, 600.00);
  INSERT INTO payments (total_amount) VALUES (400.00) RETURNING id INTO p;
  INSERT INTO payment_allocations (payment_id, amount_allocated) VALUES (p, 400.00);
END $$;
