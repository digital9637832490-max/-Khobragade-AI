import { Router } from 'express';
import { z } from 'zod';
import { pool, tx } from '../db.js';
import { requireAuth } from '../auth.js';
import { changeCoins } from '../wallet.js';
import { textProvider } from '../ai/providers.js';
export const userRouter=Router();
userRouter.use(requireAuth);

userRouter.get('/wallet', async(req,res,next)=>{
  try{const q=await pool.query('SELECT coin_balance FROM users WHERE id=$1',[req.auth!.id]);res.json({coinBalance:Number(q.rows[0]?.coin_balance||0)});}catch(e){next(e)}
});
userRouter.get('/wallet/transactions', async(req,res,next)=>{
  try{const q=await pool.query('SELECT * FROM wallet_transactions WHERE user_id=$1 ORDER BY created_at DESC LIMIT 200',[req.auth!.id]);res.json(q.rows);}catch(e){next(e)}
});
userRouter.get('/coin-packages', async(_req,res,next)=>{
  try{const q=await pool.query('SELECT * FROM coin_packages WHERE is_active=true ORDER BY sort_order, price_inr');res.json(q.rows);}catch(e){next(e)}
});
userRouter.post('/payments/request', async(req,res,next)=>{
  try{
    const b=z.object({packageId:z.string().uuid(),transactionId:z.string().min(3),proofFileKey:z.string().optional()}).parse(req.body);
    const p=await pool.query('SELECT * FROM coin_packages WHERE id=$1 AND is_active=true',[b.packageId]);
    if(!p.rowCount) return res.status(400).json({error:'Invalid package'});
    const q=await pool.query(
      `INSERT INTO payment_requests(user_id,package_id,amount_inr,transaction_id,proof_file_key)
       VALUES($1,$2,$3,$4,$5) RETURNING *`,
      [req.auth!.id,b.packageId,p.rows[0].price_inr,b.transactionId,b.proofFileKey||null]
    );
    res.status(201).json(q.rows[0]);
  }catch(e){next(e)}
});
userRouter.post('/projects', async(req,res,next)=>{
  try{
    const b=z.object({name:z.string().min(1),type:z.string().min(1),input:z.record(z.any()).default({})}).parse(req.body);
    const q=await pool.query('INSERT INTO projects(user_id,name,type,input) VALUES($1,$2,$3,$4) RETURNING *',[req.auth!.id,b.name,b.type,b.input]);
    res.status(201).json(q.rows[0]);
  }catch(e){next(e)}
});
userRouter.get('/projects', async(req,res,next)=>{
  try{const q=await pool.query('SELECT * FROM projects WHERE user_id=$1 ORDER BY created_at DESC',[req.auth!.id]);res.json(q.rows);}catch(e){next(e)}
});

async function createAiJob(userId:string, toolKey:string, input:any){
  return tx(async c=>{
    const s=await c.query('SELECT value FROM settings WHERE key=$1',[`tool.${toolKey}`]);
    const cfg=s.rows[0]?.value || {enabled:true,coinCost:0,maintenance:false};
    if(!cfg.enabled || cfg.maintenance) throw new Error('Tool unavailable');
    // Khobragade AI chat is always free for users: no app daily message limit and no coin charge.
    // Other AI tools keep their existing free-quota / coin / safety-limit rules.
    let cost=0;
    if(toolKey!=='chat'){
      const used=await c.query(`SELECT count(*) FROM ai_jobs WHERE user_id=$1 AND tool_key=$2 AND created_at >= date_trunc('day', now())`,[userId,toolKey]);
      const usedToday=Number(used.rows[0].count||0);
      const freeDailyLimit=Math.max(0,Number(cfg.freeDailyLimit||0));
      const paidCoinCost=Math.max(0,Number(cfg.coinCost||0));
      // Free quota is consumed first. After that, generations continue using coins.
      // dailyLimit is an optional safety ceiling; 0/missing means no hard daily ceiling.
      if(Number(cfg.dailyLimit||0)>0 && usedToday>=Number(cfg.dailyLimit)) throw new Error('Daily safety limit reached');
      cost=usedToday < freeDailyLimit ? 0 : paidCoinCost;
    }
    const j=await c.query(`INSERT INTO ai_jobs(user_id,tool_key,coin_cost,input) VALUES($1,$2,$3,$4) RETURNING *`,[userId,toolKey,cost,input]);
    if(cost>0) await changeCoins(c,userId,-cost,`ai:${toolKey}`,'AI generation',j.rows[0].id);
    return j.rows[0];
  });
}
userRouter.post('/ai/voice-chat', async(req,res,next)=>{try{
  const b=z.object({
    message:z.string().min(1).max(12000),
    history:z.array(z.object({role:z.enum(['user','assistant']),content:z.string()})).max(20).default([]),
    voiceGender:z.enum(['female','male']).default('female'),
    localDateTime:z.string().max(120).optional(),
    timeZone:z.string().max(120).optional(),
    latitude:z.number().min(-90).max(90).optional(),
    longitude:z.number().min(-180).max(180).optional()
  }).parse(req.body);
  const result=await textProvider.generate({mode:'chat',message:b.message,history:b.history,voiceGender:b.voiceGender,localDateTime:b.localDateTime,timeZone:b.timeZone,latitude:b.latitude,longitude:b.longitude});
  res.json(result);
}catch(e){next(e)}});
userRouter.post('/ai/chat', async(req,res,next)=>{try{const b=z.object({message:z.string().min(1).max(12000),history:z.array(z.object({role:z.enum(['user','assistant']),content:z.string()})).max(20).default([]),voiceGender:z.enum(['female','male']).default('female'),localDateTime:z.string().max(120).optional(),timeZone:z.string().max(120).optional(),latitude:z.number().min(-90).max(90).optional(),longitude:z.number().min(-180).max(180).optional(),attachmentName:z.string().max(255).optional(),attachmentMime:z.string().max(120).optional(),attachmentData:z.string().max(20_000_000).optional()}).parse(req.body);res.status(202).json(await createAiJob(req.auth!.id,'chat',{mode:'chat',message:b.message,history:b.history,voiceGender:b.voiceGender,localDateTime:b.localDateTime,timeZone:b.timeZone,latitude:b.latitude,longitude:b.longitude,attachmentName:b.attachmentName,attachmentMime:b.attachmentMime,attachmentData:b.attachmentData}));}catch(e){next(e)}});
userRouter.post('/ai/thumbnail', async(req,res,next)=>{try{res.status(202).json(await createAiJob(req.auth!.id,'thumbnail',req.body));}catch(e){next(e)}});
userRouter.post('/ai/photo', async(req,res,next)=>{try{res.status(202).json(await createAiJob(req.auth!.id,'photo',req.body));}catch(e){next(e)}});
userRouter.post('/ai/content', async(req,res,next)=>{try{
  const tool=z.enum(['title','description','tags']).default('title').parse(req.body.tool || 'title');
  res.status(202).json(await createAiJob(req.auth!.id,tool,req.body));
}catch(e){next(e)}});
userRouter.post('/ai/voiceover', async(req,res,next)=>{try{res.status(202).json(await createAiJob(req.auth!.id,'voiceover',req.body));}catch(e){next(e)}});
userRouter.post('/ai/video', async(req,res,next)=>{try{res.status(202).json(await createAiJob(req.auth!.id,'video',req.body));}catch(e){next(e)}});
userRouter.get('/jobs', async(req,res,next)=>{try{const q=await pool.query('SELECT * FROM ai_jobs WHERE user_id=$1 ORDER BY created_at DESC LIMIT 200',[req.auth!.id]);res.json(q.rows)}catch(e){next(e)}});
userRouter.get('/ai/video/:id/file', async(req,res,next)=>{
  try{
    const q=await pool.query('SELECT result FROM ai_jobs WHERE id=$1 AND user_id=$2 AND tool_key=$3 AND status=$4',[req.params.id,req.auth!.id,'video','completed']);
    if(!q.rowCount) return res.status(404).json({error:'Generated video not found'});
    const uri=String(q.rows[0]?.result?.videoUri||q.rows[0]?.result?.videoUrl||'');
    if(!uri) return res.status(404).json({error:'Video file is not available'});
    const apiKey=process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY || '';
    if(!apiKey) return res.status(500).json({error:'Gemini API key missing'});
    const r=await fetch(uri,{headers:{'x-goog-api-key':apiKey}});
    if(!r.ok) return res.status(r.status).json({error:'Generated video could not be downloaded'});
    res.setHeader('Content-Type',r.headers.get('content-type')||'video/mp4');
    res.setHeader('Cache-Control','private, max-age=300');
    if(r.headers.get('content-length')) res.setHeader('Content-Length',r.headers.get('content-length')!);
    const body=r.body;
    if(!body) return res.status(502).json({error:'Generated video stream unavailable'});
    const reader=body.getReader();
    res.on('close',()=>{try{reader.cancel()}catch{}});
    for(;;){
      const {done,value}=await reader.read();
      if(done) break;
      res.write(Buffer.from(value));
    }
    res.end();
  }catch(e){next(e)}
});
userRouter.get('/jobs/:id', async(req,res,next)=>{
  try{
    const q=await pool.query('SELECT * FROM ai_jobs WHERE id=$1 AND user_id=$2',[req.params.id,req.auth!.id]);
    if(!q.rowCount) return res.status(404).json({error:'Not found'}); res.json(q.rows[0]);
  }catch(e){next(e)}
});
userRouter.get('/notifications', async(req,res,next)=>{
  try{const q=await pool.query('SELECT * FROM notifications WHERE user_id=$1 OR user_id IS NULL ORDER BY created_at DESC LIMIT 100',[req.auth!.id]);res.json(q.rows);}catch(e){next(e)}
});
userRouter.get('/support', async(req,res,next)=>{try{const q=await pool.query('SELECT * FROM support_tickets WHERE user_id=$1 ORDER BY created_at DESC',[req.auth!.id]);res.json(q.rows)}catch(e){next(e)}});
userRouter.post('/support', async(req,res,next)=>{
  try{
    const b=z.object({subject:z.string().min(2),message:z.string().min(2)}).parse(req.body);
    const q=await pool.query('INSERT INTO support_tickets(user_id,subject,message) VALUES($1,$2,$3) RETURNING *',[req.auth!.id,b.subject,b.message]);
    res.status(201).json(q.rows[0]);
  }catch(e){next(e)}
});

userRouter.post('/support/:id/reply', async(req,res,next)=>{try{const b=z.object({message:z.string().min(1)}).parse(req.body);const own=await pool.query('SELECT id FROM support_tickets WHERE id=$1 AND user_id=$2',[req.params.id,req.auth!.id]);if(!own.rowCount)return res.status(404).json({error:'Not found'});await pool.query(`INSERT INTO support_messages(ticket_id,sender_role,sender_id,message) VALUES($1,'user',$2,$3)`,[req.params.id,req.auth!.id,b.message]);await pool.query(`UPDATE support_tickets SET status='open',updated_at=now() WHERE id=$1`,[req.params.id]);res.json({ok:true})}catch(e){next(e)}});
