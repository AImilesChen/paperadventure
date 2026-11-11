-- Additive, rerunnable. Existing balance is the opening balance, never a new reward.
CREATE TABLE IF NOT EXISTS sudoku_point_orders (
 id TEXT PRIMARY KEY, owner TEXT NOT NULL REFERENCES sudoku_accounts(owner), request_key TEXT NOT NULL,
 sku TEXT NOT NULL, points INTEGER NOT NULL CHECK(points>0), amount INTEGER NOT NULL CHECK(amount>0), currency TEXT NOT NULL,
 price_id TEXT NOT NULL, mode TEXT NOT NULL CHECK(mode IN('test','live')), status TEXT NOT NULL DEFAULT 'creating',
 checkout_id TEXT UNIQUE, checkout_url TEXT, payment_intent TEXT UNIQUE, customer_id TEXT,
 terms_version TEXT NOT NULL, return_to TEXT NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
 UNIQUE(owner,request_key)
);
CREATE INDEX IF NOT EXISTS sudoku_point_order_owner ON sudoku_point_orders(owner,created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS sudoku_point_open_order ON sudoku_point_orders(owner,sku,mode) WHERE status IN('creating','pending');
CREATE TABLE IF NOT EXISTS sudoku_point_grants (
 id INTEGER PRIMARY KEY AUTOINCREMENT, order_id TEXT NOT NULL UNIQUE REFERENCES sudoku_point_orders(id),
 owner TEXT NOT NULL REFERENCES sudoku_accounts(owner), points INTEGER NOT NULL CHECK(points>0),
 remaining INTEGER NOT NULL CHECK(remaining>=0 AND remaining<=points), revoked INTEGER NOT NULL DEFAULT 0, refund_target INTEGER NOT NULL DEFAULT 0,
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN('pending','applied')), created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS sudoku_point_refunds (
 id TEXT PRIMARY KEY, order_id TEXT NOT NULL REFERENCES sudoku_point_orders(id), amount INTEGER NOT NULL,
 status TEXT NOT NULL, revoked INTEGER NOT NULL DEFAULT 0, needs_review INTEGER NOT NULL DEFAULT 0, updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS sudoku_point_events (
 id TEXT PRIMARY KEY, type TEXT NOT NULL, object_id TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending',
 attempts INTEGER NOT NULL DEFAULT 0, last_error TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS sudoku_point_customers (
 owner TEXT NOT NULL REFERENCES sudoku_accounts(owner), mode TEXT NOT NULL, customer_id TEXT NOT NULL UNIQUE, PRIMARY KEY(owner,mode)
);
CREATE TABLE IF NOT EXISTS sudoku_point_reviews (
 id TEXT PRIMARY KEY, order_id TEXT NOT NULL REFERENCES sudoku_point_orders(id), operator TEXT NOT NULL, note TEXT NOT NULL, created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS sudoku_wallet_entries (
 id INTEGER PRIMARY KEY AUTOINCREMENT, owner TEXT NOT NULL REFERENCES sudoku_accounts(owner),
 reference TEXT NOT NULL, source_ref TEXT, kind TEXT NOT NULL, delta INTEGER NOT NULL,
 paid_delta INTEGER NOT NULL DEFAULT 0, balance_after INTEGER NOT NULL CHECK(balance_after>=0),
 reason TEXT NOT NULL, created_at INTEGER NOT NULL, UNIQUE(owner,reference)
);
CREATE INDEX IF NOT EXISTS sudoku_wallet_owner ON sudoku_wallet_entries(owner,id DESC);
CREATE TABLE IF NOT EXISTS sudoku_point_spends (
 entry_id INTEGER NOT NULL REFERENCES sudoku_wallet_entries(id), grant_id INTEGER NOT NULL REFERENCES sudoku_point_grants(id),
 points INTEGER NOT NULL CHECK(points>0), PRIMARY KEY(entry_id,grant_id)
);
INSERT OR IGNORE INTO sudoku_wallet_entries(owner,reference,kind,delta,balance_after,reason,created_at)
 SELECT owner,'opening-v49','opening',json_extract(state_json,'$.balance'),json_extract(state_json,'$.balance'),'Opening balance carried forward',updated_at FROM sudoku_accounts;
CREATE TRIGGER IF NOT EXISTS sudoku_wallet_open AFTER INSERT ON sudoku_accounts BEGIN
 INSERT OR IGNORE INTO sudoku_wallet_entries(owner,reference,kind,delta,balance_after,reason,created_at)
 VALUES(NEW.owner,'opening-v49','opening',json_extract(NEW.state_json,'$.balance'),json_extract(NEW.state_json,'$.balance'),'Starting balance',NEW.updated_at);
END;
CREATE TRIGGER IF NOT EXISTS sudoku_wallet_valid BEFORE UPDATE OF state_json ON sudoku_accounts BEGIN
 SELECT CASE WHEN json_type(NEW.state_json,'$.balance') IS NULL OR json_type(NEW.state_json,'$.balance') NOT IN('integer','real') OR json_extract(NEW.state_json,'$.balance')!=CAST(json_extract(NEW.state_json,'$.balance') AS INTEGER) OR json_extract(NEW.state_json,'$.balance')<0
 OR COALESCE(json_extract(NEW.state_json,'$.paidBalance'),0)!=CAST(COALESCE(json_extract(NEW.state_json,'$.paidBalance'),0) AS INTEGER)
 OR COALESCE(json_extract(NEW.state_json,'$.paidBalance'),0)<0
 OR COALESCE(json_extract(NEW.state_json,'$.paidBalance'),0)>json_extract(NEW.state_json,'$.balance')
 THEN RAISE(ABORT,'Invalid wallet balance') END;
END;
CREATE TRIGGER IF NOT EXISTS sudoku_wallet_change AFTER UPDATE OF state_json ON sudoku_accounts
 WHEN json_extract(NEW.state_json,'$.balance')!=json_extract(OLD.state_json,'$.balance') BEGIN
 INSERT INTO sudoku_wallet_entries(owner,reference,source_ref,kind,delta,paid_delta,balance_after,reason,created_at)
 VALUES(NEW.owner,'revision:'||NEW.revision,json_extract(NEW.state_json,'$.ledger[#-1].id'),
 COALESCE(json_extract(NEW.state_json,'$.ledger[#-1].kind'),'activity'),
 json_extract(NEW.state_json,'$.balance')-json_extract(OLD.state_json,'$.balance'),
 COALESCE(json_extract(NEW.state_json,'$.paidBalance'),0)-COALESCE(json_extract(OLD.state_json,'$.paidBalance'),0),
 json_extract(NEW.state_json,'$.balance'),COALESCE(json_extract(NEW.state_json,'$.ledger[#-1].reason'),'Wallet update'),NEW.updated_at);
END;
-- Allocate paid consumption from oldest grants using a stable SELECT before updating lots.
CREATE TRIGGER IF NOT EXISTS sudoku_wallet_paid_spend AFTER INSERT ON sudoku_wallet_entries
 WHEN NEW.paid_delta<0 AND NEW.kind!='refund' BEGIN
 INSERT INTO sudoku_point_spends(entry_id,grant_id,points)
 SELECT NEW.id,g.id,MIN(g.remaining,MAX(0,-NEW.paid_delta-COALESCE((SELECT SUM(p.remaining) FROM sudoku_point_grants p WHERE p.owner=g.owner AND p.status='applied' AND p.id<g.id),0)))
 FROM sudoku_point_grants g WHERE g.owner=NEW.owner AND g.status='applied' AND g.remaining>0
 AND -NEW.paid_delta>COALESCE((SELECT SUM(p.remaining) FROM sudoku_point_grants p WHERE p.owner=g.owner AND p.status='applied' AND p.id<g.id),0);
 SELECT CASE WHEN COALESCE((SELECT SUM(points) FROM sudoku_point_spends WHERE entry_id=NEW.id),0)!=-NEW.paid_delta THEN RAISE(ABORT,'Paid wallet allocation mismatch') END;
 UPDATE sudoku_point_grants SET remaining=remaining-COALESCE((SELECT points FROM sudoku_point_spends WHERE entry_id=NEW.id AND grant_id=sudoku_point_grants.id),0) WHERE owner=NEW.owner;
END;

CREATE TABLE IF NOT EXISTS sudoku_points_schema(version INTEGER PRIMARY KEY);
CREATE TABLE IF NOT EXISTS sudoku_point_consents(order_id TEXT PRIMARY KEY REFERENCES sudoku_point_orders(id),snapshot_json TEXT NOT NULL,created_at INTEGER NOT NULL);
INSERT OR IGNORE INTO sudoku_points_schema(version) VALUES(1);
