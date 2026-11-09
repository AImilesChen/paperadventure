CREATE TABLE IF NOT EXISTS sudoku_accounts (
 owner TEXT PRIMARY KEY,
 revision INTEGER NOT NULL DEFAULT 0,
 state_json TEXT NOT NULL,
 nickname TEXT NOT NULL,
 listed INTEGER NOT NULL DEFAULT 0,
 verified INTEGER NOT NULL DEFAULT 0,
 highest INTEGER NOT NULL DEFAULT 0,
 independent INTEGER NOT NULL DEFAULT 0,
 assisted INTEGER NOT NULL DEFAULT 0,
 version TEXT NOT NULL DEFAULT 'v1',
 updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS sudoku_rank ON sudoku_accounts(version,listed,verified,highest DESC);
