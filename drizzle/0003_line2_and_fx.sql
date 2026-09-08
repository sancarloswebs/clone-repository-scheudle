ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'ARS';

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS foreign_amount numeric(18,4);

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS exchange_rate numeric(18,4);

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS exchange_rate_source text;

-- Existing rows remain untouched and continue to be Línea 1 / ARS.
