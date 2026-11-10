// First-clear snapshots are immutable on replay. Missing historical timing is
// never zero: complete timing precedes incomplete timing at the same clear count.
export function firstClearTiming(state){
 let elapsedMs=0,timedClears=0,reachedAt=0;
 for(let level=1;level<=(state?.highest||0);level++){
  const c=state.completions?.[level];
  if(Number.isSafeInteger(c?.at)&&c.at>0)reachedAt=Math.max(reachedAt,c.at);
  if(Number.isSafeInteger(c?.elapsed)&&c.elapsed>0&&(!c.timingStatus||c.timingStatus==='valid')){elapsedMs+=c.elapsed;timedClears++;}
 }
 return {elapsedMs:timedClears===state?.highest&&timedClears>0?elapsedMs:null,timedClears,reachedAt:reachedAt||null};
}

// Used in a SQL CTE to avoid a separate projection/migration or rewriting history.
export function firstClearCtes(speed=false){
 const status=speed?`COALESCE((SELECT t.status FROM sudoku_speed_attempts t WHERE (t.id=json_extract(c.value,'$.timingAttemptId') OR (json_extract(c.value,'$.timingAttemptId') IS NULL AND t.level=CAST(c.key AS INTEGER) AND t.finished_at=json_extract(c.value,'$.at') AND (t.owner=a.owner OR t.owner IN(SELECT value FROM json_each(a.state_json,'$.imported'))))) LIMIT 1),json_extract(c.value,'$.timingStatus'),'valid')`:`COALESCE(json_extract(c.value,'$.timingStatus'),'valid')`;
 return `snapshots AS (
 SELECT a.owner,a.nickname,a.highest,a.state_json,
 COUNT(c.key) AS recordedClears,
 SUM(CASE WHEN json_type(c.value,'$.elapsed')='integer' AND json_extract(c.value,'$.elapsed')>0
  AND ${status}='valid' THEN 1 ELSE 0 END) AS timedClears,
 SUM(CASE WHEN json_type(c.value,'$.elapsed')='integer' AND json_extract(c.value,'$.elapsed')>0
  AND ${status}='valid' THEN json_extract(c.value,'$.elapsed') ELSE 0 END) AS elapsedSum,
 MAX(CASE WHEN json_type(c.value,'$.at')='integer' AND json_extract(c.value,'$.at')>0 THEN json_extract(c.value,'$.at') END) AS reachedAt
 FROM sudoku_accounts a LEFT JOIN json_each(a.state_json,'$.completions') c
 ON CAST(c.key AS INTEGER) BETWEEN 1 AND a.highest
 WHERE a.version='v1' AND a.verified=1 AND a.listed=1 AND a.highest>0
 GROUP BY a.owner
), eligible AS (
 SELECT *,highest AS score,CASE WHEN timedClears=highest AND recordedClears=highest THEN elapsedSum END AS elapsedMs FROM snapshots
), ranked AS (
 SELECT *,ROW_NUMBER() OVER(ORDER BY score DESC,(elapsedMs IS NULL),elapsedMs,(reachedAt IS NULL),reachedAt,owner) AS rank,
 COUNT(*) OVER() AS total FROM eligible
)`;
}
