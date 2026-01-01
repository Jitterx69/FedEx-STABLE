CREATE TABLE IF NOT EXISTS accounts (
    account_id TEXT PRIMARY KEY,
    outstanding_balance DOUBLE PRECISION NOT NULL,
    days_past_due INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'ingested', -- ingested, assigned, etc.
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS assignments (
    assignment_id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL REFERENCES accounts(account_id),
    dca_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    assigned_at TIMESTAMPTZ DEFAULT NOW()
);
