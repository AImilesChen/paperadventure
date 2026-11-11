import {DatabaseSync} from 'node:sqlite';
export function sqliteD1(path=':memory:'){
 const sqlite=new DatabaseSync(path);sqlite.exec('PRAGMA foreign_keys=ON');
 let gate=Promise.resolve(); const db={prepare(sql){return{bind(...args){return{async first(){return sqlite.prepare(sql).get(...args)||null;},async all(){return{results:sqlite.prepare(sql).all(...args)};},async run(){const r=sqlite.prepare(sql).run(...args);return{meta:{changes:Number(r.changes)}};}};}};},batch(statements){const run=gate.then(async()=>{sqlite.exec('BEGIN IMMEDIATE');try{const r=[];for(const s of statements)r.push(await s.run());sqlite.exec('COMMIT');return r;}catch(e){sqlite.exec('ROLLBACK');throw e;}});gate=run.catch(()=>{});return run;}};return{db,sqlite,close:()=>sqlite.close()};
}
