-- Remove the unused legacy account reason column and its stored values.
-- Safe to repeat after the column has already been removed.
ALTER TABLE public.suspicious_accounts DROP COLUMN IF EXISTS reason;
