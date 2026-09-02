import { pool } from './db.js';
import { textProvider, imageProvider, videoProvider } from './ai/providers.js';

async function processOne(){
  const client=await pool.connect();
  let job:any;
  try{
    await client.query('BEGIN');
    const q=await client.query(`SELECT * FROM ai_jobs WHERE status='pending' ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1`);
    if(!q.rowCount){ await client.query('COMMIT'); return false; }
    job=q.rows[0];
    await client.query(`UPDATE ai_jobs SET status='processing',started_at=now(),attempts=attempts+1 WHERE id=$1`,[job.id]);
    await client.query('COMMIT');
  }catch(e){await client.query('ROLLBACK');throw e}
  finally{client.release()}
  try{
    const result = job.tool_key==='thumbnail' ? await imageProvider.generate(job.input)
      : (job.tool_key==='video' || job.tool_key==='voiceover') ? await videoProvider.generate(job.input)
      : await textProvider.generate(job.input);
    await pool.query(`UPDATE ai_jobs SET status='completed',result=$2,completed_at=now() WHERE id=$1`,[job.id,result]);
  }catch(e:any){
    await pool.query(`UPDATE ai_jobs SET status='failed',error_message=$2,completed_at=now() WHERE id=$1`,[job.id,String(e?.message||e)]);
  }
  return true;
}
async function main(){
  console.log('Creator Studio worker started');
  for(;;){
    const did=await processOne().catch(e=>{console.error(e);return false});
    if(!did) await new Promise(r=>setTimeout(r,1500));
  }
}
main();
