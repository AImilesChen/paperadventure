CREATE TABLE IF NOT EXISTS sudoku_speed_attempts (
 id TEXT PRIMARY KEY, owner TEXT NOT NULL, level INTEGER NOT NULL, puzzle_version TEXT NOT NULL, rules TEXT NOT NULL,
 started_at INTEGER NOT NULL, finished_at INTEGER, seconds INTEGER, status TEXT NOT NULL, reason TEXT NOT NULL DEFAULT '', saves INTEGER NOT NULL DEFAULT 0,
 reviewed_by TEXT, reviewed_at INTEGER, updated_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS sudoku_speed_rank ON sudoku_speed_attempts(level,puzzle_version,rules,status,seconds,owner);
CREATE INDEX IF NOT EXISTS sudoku_speed_owner ON sudoku_speed_attempts(owner,level);
CREATE TABLE IF NOT EXISTS sudoku_speed_reviews(id INTEGER PRIMARY KEY, attempt_id TEXT NOT NULL, operator TEXT NOT NULL, status TEXT NOT NULL, reason TEXT NOT NULL, at INTEGER NOT NULL);
CREATE TRIGGER IF NOT EXISTS sudoku_speed_project AFTER UPDATE OF state_json ON sudoku_accounts BEGIN
 INSERT INTO sudoku_speed_attempts(id,owner,level,puzzle_version,rules,started_at,finished_at,seconds,status,reason,saves,updated_at)
 SELECT json_extract(v,'$.id'),NEW.owner,json_extract(v,'$.level'),json_extract(v,'$.puzzleVersion'),json_extract(v,'$.rules'),json_extract(v,'$.startedAt'),json_extract(v,'$.finishedAt'),json_extract(v,'$.seconds'),json_extract(v,'$.status'),COALESCE(json_extract(v,'$.reason'),''),json_extract(v,'$.saves'),NEW.updated_at
 FROM (SELECT json_extract(value,'$.speed') AS v FROM json_each(NEW.state_json,'$.sessions') UNION ALL SELECT json_extract(NEW.state_json,'$.lastSpeedAttempt')) WHERE v IS NOT NULL
 ON CONFLICT(id) DO UPDATE SET finished_at=excluded.finished_at,seconds=excluded.seconds,saves=excluded.saves,
 status=CASE WHEN sudoku_speed_attempts.reviewed_at IS NULL THEN excluded.status ELSE sudoku_speed_attempts.status END,
 reason=CASE WHEN sudoku_speed_attempts.reviewed_at IS NULL THEN excluded.reason ELSE sudoku_speed_attempts.reason END,updated_at=excluded.updated_at WHERE sudoku_speed_attempts.finished_at IS NOT excluded.finished_at OR sudoku_speed_attempts.saves!=excluded.saves OR (sudoku_speed_attempts.reviewed_at IS NULL AND sudoku_speed_attempts.status!=excluded.status);
END;
