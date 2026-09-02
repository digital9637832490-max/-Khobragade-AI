import pg from 'pg';
import { config } from './config.js';
export const pool = new pg.Pool({ connectionString: config.databaseUrl });
export async function tx<T>(fn:(client:pg.PoolClient)=>Promise<T>):Promise<T>{
  const client = await pool.connect();
  try { await client.query('BEGIN'); const out = await fn(client); await client.query('COMMIT'); return out; }
  catch(e){ await client.query('ROLLBACK'); throw e; }
  finally { client.release(); }
}
