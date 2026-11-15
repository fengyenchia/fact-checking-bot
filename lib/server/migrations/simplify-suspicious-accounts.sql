-- For databases initialized before the account form was simplified.
-- Keep old field values and permit new rows that supply only the account ID.
ALTER TABLE suspicious_accounts ALTER COLUMN reason DROP NOT NULL;
