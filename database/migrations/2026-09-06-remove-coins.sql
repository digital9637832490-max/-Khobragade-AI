-- Khobragade AI: remove the Coins / Recharge / Wallet user-facing flow.
-- Safe cleanup for an existing database: application code no longer reads or writes wallet data.
-- Keep ai_jobs.coin_cost as a zero-valued legacy column for backward compatibility with old rows/builds.
DROP TABLE IF EXISTS payment_requests CASCADE;
DROP TABLE IF EXISTS wallet_transactions CASCADE;
DROP TABLE IF EXISTS coin_packages CASCADE;
ALTER TABLE IF EXISTS users DROP COLUMN IF EXISTS coin_balance;
DROP TYPE IF EXISTS ledger_type CASCADE;
