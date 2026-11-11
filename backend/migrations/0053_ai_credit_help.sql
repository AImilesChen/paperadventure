-- Existing wallet/payment tables keep their historical names for compatibility.
-- A single account balance and paid grant allocation remain authoritative.
CREATE TABLE IF NOT EXISTS ai_credit_help_requests(
 owner TEXT NOT NULL REFERENCES sudoku_accounts(owner),request_id TEXT NOT NULL,
 fingerprint TEXT NOT NULL,response_json TEXT NOT NULL,created_at INTEGER NOT NULL,
 PRIMARY KEY(owner,request_id)
);
CREATE TABLE IF NOT EXISTS ai_credit_help_limits(
 owner TEXT NOT NULL,minute INTEGER NOT NULL,attempts INTEGER NOT NULL DEFAULT 0,
 PRIMARY KEY(owner,minute)
);
