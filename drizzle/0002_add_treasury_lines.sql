-- Safe, additive migration for production.
-- Existing payments are preserved and receive line = 1.
ALTER TABLE payments ADD COLUMN IF NOT EXISTS line integer NOT NULL DEFAULT 1;
CREATE INDEX IF NOT EXISTS payments_line_date_idx ON payments (line, date);
