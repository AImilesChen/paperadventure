-- Server-only, mode-specific published Price mapping and bounded setup audit.
CREATE TABLE IF NOT EXISTS sudoku_point_products (
 mode TEXT NOT NULL CHECK(mode IN('test','live')),sku TEXT NOT NULL,
 product_id TEXT NOT NULL,price_id TEXT NOT NULL,amount INTEGER NOT NULL,
 points INTEGER NOT NULL,currency TEXT NOT NULL,verified_at INTEGER NOT NULL,
 PRIMARY KEY(mode,sku),UNIQUE(mode,price_id)
);
CREATE TABLE IF NOT EXISTS sudoku_point_setup (
 id TEXT PRIMARY KEY,status TEXT NOT NULL DEFAULT 'pending',
 attempts INTEGER NOT NULL DEFAULT 0,lease_until INTEGER NOT NULL DEFAULT 0,
 stage TEXT,error_code TEXT,updated_at INTEGER NOT NULL DEFAULT 0
);
