import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { pool, tx } from '../db.js';
import { requireAuth, requireAdmin, signToken } from '../auth.js';
import { changeCoins } from '../wallet.js';
export const adminRouter=Router();

adminRouter.post('/login', async(req,res,next)=>{
  try{
    const b=z.object({email:z.string().email(),password:z.string().min(1)}).parse(req.body);
    const q=await pool.query('SELECT * FROM admins WHERE email=lower($1)',[b.email]);
    const a=q.rows[0];
    if(!a || !(await bcrypt.compare(b.password,a.password_hash))) return res.status(401).json({error:'Invalid credentials'});
    await pool.query(`INSERT INTO audit_logs(admin_id,action,entity_type) VALUES($1,'admin.login','admin')`,[a.id]);
    res.json({token:signToken(a.id,'admin'),admin:{id:a.id,email:a.email,role:a.role}});
  }catch(e){next(e)}
});

adminRouter.use(requireAuth,requireAdmin);

async function audit(adminId:string, action:string, entityType:string, entityId?:string, metadata:any={}){
  await pool.query('INSERT INTO audit_logs(admin_id,action,entity_type,entity_id,metadata) VALUES($1,$2,$3,$4,$5)',[adminId,action,entityType,entityId||null,metadata]);
}
adminRouter.get('/users', async(_req,res,next)=>{
  try{const q=await pool.query('SELECT id,name,email,coin_balance,status,created_at FROM users ORDER BY created_at DESC LIMIT 500');res.json(q.rows);}catch(e){next(e)}
});
adminRouter.post('/users/:id/coins', async(req,res,next)=>{
  try{
    const b=z.object({delta:z.number().int().refine(v=>v!==0),reason:z.string().min(2)}).parse(req.body);
    const out=await tx(async c=>changeCoins(c,req.params.id,b.delta,'admin_adjustment',b.reason,undefined,req.auth!.id));
    await audit(req.auth!.id,'wallet.adjust','user',req.params.id,{delta:b.delta,reason:b.reason});
    res.json(out);
  }catch(e){next(e)}
});
adminRouter.post('/users/:id/status', async(req,res,next)=>{
  try{
    const b=z.object({status:z.enum(['active','blocked'])}).parse(req.body);
    await pool.query('UPDATE users SET status=$2,updated_at=now() WHERE id=$1',[req.params.id,b.status]);
    await audit(req.auth!.id,'user.status','user',req.params.id,b);
    res.json({ok:true});
  }catch(e){next(e)}
});
adminRouter.get('/payments', async(_req,res,next)=>{
  try{const q=await pool.query(`SELECT p.*,u.name,u.email,c.name package_name,c.coins,c.bonus_coins FROM payment_requests p JOIN users u ON u.id=p.user_id JOIN coin_packages c ON c.id=p.package_id ORDER BY p.created_at DESC`);res.json(q.rows);}catch(e){next(e)}
});
adminRouter.post('/payments/:id/approve', async(req,res,next)=>{
  try{
    const out=await tx(async c=>{
      const p=await c.query(`SELECT p.*,c.coins,c.bonus_coins FROM payment_requests p JOIN coin_packages c ON c.id=p.package_id WHERE p.id=$1 FOR UPDATE`,[req.params.id]);
      if(!p.rowCount) throw new Error('Payment not found');
      if(p.rows[0].status==='approved') return {alreadyApproved:true};
      if(p.rows[0].status!=='pending') throw new Error('Payment not pending');
      const total=Number(p.rows[0].coins)+Number(p.rows[0].bonus_coins);
      await changeCoins(c,p.rows[0].user_id,total,'package_purchase','Payment approved',p.rows[0].id,req.auth!.id);
      await c.query(`UPDATE payment_requests SET status='approved',reviewed_by=$2,reviewed_at=now() WHERE id=$1`,[req.params.id,req.auth!.id]);
      await c.query(`INSERT INTO notifications(user_id,title,body,type) VALUES($1,'Payment Approved',$2,'payment')`,[p.rows[0].user_id,`${total} coins added to your wallet.`]);
      return {approved:true,coinsAdded:total};
    });
    await audit(req.auth!.id,'payment.approve','payment_request',req.params.id);
    res.json(out);
  }catch(e){next(e)}
});
adminRouter.post('/payments/:id/reject', async(req,res,next)=>{
  try{
    const b=z.object({reason:z.string().min(2)}).parse(req.body);
    const q=await pool.query(`UPDATE payment_requests SET status='rejected',reviewed_by=$2,reviewed_at=now(),rejection_reason=$3 WHERE id=$1 AND status='pending' RETURNING user_id`,[req.params.id,req.auth!.id,b.reason]);
    if(!q.rowCount) return res.status(409).json({error:'Payment is not pending'});
    await pool.query(`INSERT INTO notifications(user_id,title,body,type) VALUES($1,'Payment Rejected',$2,'payment')`,[q.rows[0].user_id,b.reason]);
    await audit(req.auth!.id,'payment.reject','payment_request',req.params.id,b);
    res.json({rejected:true});
  }catch(e){next(e)}
});
adminRouter.get('/reports', async(_req,res,next)=>{
  try{
    const q=await pool.query(`SELECT
      (SELECT count(*) FROM users) total_users,
      (SELECT count(*) FROM users WHERE status='active') active_users,
      (SELECT count(*) FROM payment_requests WHERE status='pending') pending_payments,
      (SELECT count(*) FROM payment_requests WHERE status='approved') approved_payments,
      (SELECT coalesce(sum(amount_inr),0) FROM payment_requests WHERE status='approved') total_revenue,
      (SELECT coalesce(sum(coins),0) FROM wallet_transactions WHERE type='credit' AND source='package_purchase') coins_sold,
      (SELECT coalesce(sum(coins),0) FROM wallet_transactions WHERE type='debit') coins_used,
      (SELECT count(*) FROM ai_jobs) ai_generations,
      (SELECT count(*) FROM ai_jobs WHERE tool_key='video') video_jobs,
      (SELECT count(*) FROM ai_jobs WHERE status='failed') failed_jobs`);
    res.json(q.rows[0]);
  }catch(e){next(e)}
});
adminRouter.get('/audit-logs', async(_req,res,next)=>{
  try{const q=await pool.query('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 500');res.json(q.rows);}catch(e){next(e)}
});
adminRouter.patch('/settings/:key', async(req,res,next)=>{
  try{
    const value=z.record(z.any()).parse(req.body);
    await pool.query(`INSERT INTO settings(key,value,updated_by,updated_at) VALUES($1,$2,$3,now())
      ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_by=excluded.updated_by,updated_at=now()`,[req.params.key,value,req.auth!.id]);
    await audit(req.auth!.id,'settings.update','setting',undefined,{key:req.params.key,value});
    res.json({ok:true});
  }catch(e){next(e)}
});

adminRouter.get('/coin-packages', async(_req,res,next)=>{try{const q=await pool.query('SELECT * FROM coin_packages ORDER BY sort_order,price_inr');res.json(q.rows)}catch(e){next(e)}});
adminRouter.post('/coin-packages', async(req,res,next)=>{try{const b=z.object({name:z.string().min(1),coins:z.number().int().positive(),bonusCoins:z.number().int().nonnegative().default(0),priceInr:z.number().nonnegative(),isActive:z.boolean().default(true)}).parse(req.body);const q=await pool.query('INSERT INTO coin_packages(name,coins,bonus_coins,price_inr,is_active) VALUES($1,$2,$3,$4,$5) RETURNING *',[b.name,b.coins,b.bonusCoins,b.priceInr,b.isActive]);await audit(req.auth!.id,'package.create','coin_package',q.rows[0].id,b);res.status(201).json(q.rows[0])}catch(e){next(e)}});
adminRouter.patch('/coin-packages/:id', async(req,res,next)=>{try{const b=z.object({name:z.string().min(1),coins:z.number().int().positive(),bonusCoins:z.number().int().nonnegative(),priceInr:z.number().nonnegative(),isActive:z.boolean()}).parse(req.body);const q=await pool.query('UPDATE coin_packages SET name=$2,coins=$3,bonus_coins=$4,price_inr=$5,is_active=$6,updated_at=now() WHERE id=$1 RETURNING *',[req.params.id,b.name,b.coins,b.bonusCoins,b.priceInr,b.isActive]);await audit(req.auth!.id,'package.update','coin_package',req.params.id,b);res.json(q.rows[0])}catch(e){next(e)}});
adminRouter.delete('/coin-packages/:id', async(req,res,next)=>{try{await pool.query('UPDATE coin_packages SET is_active=false,updated_at=now() WHERE id=$1',[req.params.id]);await audit(req.auth!.id,'package.disable','coin_package',req.params.id);res.json({ok:true})}catch(e){next(e)}});

adminRouter.get('/projects', async(_req,res,next)=>{try{const q=await pool.query(`SELECT p.*,u.name user_name,u.email FROM projects p JOIN users u ON u.id=p.user_id ORDER BY p.created_at DESC LIMIT 500`);res.json(q.rows)}catch(e){next(e)}});
adminRouter.get('/jobs', async(_req,res,next)=>{try{const q=await pool.query(`SELECT j.*,u.name user_name,u.email FROM ai_jobs j JOIN users u ON u.id=j.user_id ORDER BY j.created_at DESC LIMIT 500`);res.json(q.rows)}catch(e){next(e)}});
adminRouter.delete('/jobs/:id', async(req,res,next)=>{try{await pool.query(`DELETE FROM ai_jobs WHERE id=$1 AND status IN ('failed','completed')`,[req.params.id]);await audit(req.auth!.id,'job.delete','ai_job',req.params.id);res.json({ok:true})}catch(e){next(e)}});
adminRouter.post('/jobs/:id/block', async(req,res,next)=>{try{await pool.query(`UPDATE ai_jobs SET status='failed',error_message='Blocked by admin',completed_at=now() WHERE id=$1 AND status IN ('pending','processing')`,[req.params.id]);await audit(req.auth!.id,'job.block','ai_job',req.params.id);res.json({ok:true})}catch(e){next(e)}});

adminRouter.post('/notifications', async(req,res,next)=>{try{const b=z.object({userId:z.string().uuid().nullable().optional(),title:z.string().min(1),body:z.string().min(1),type:z.string().default('info')}).parse(req.body);const q=await pool.query('INSERT INTO notifications(user_id,title,body,type) VALUES($1,$2,$3,$4) RETURNING *',[b.userId||null,b.title,b.body,b.type]);await audit(req.auth!.id,'notification.send','notification',q.rows[0].id,b);res.status(201).json(q.rows[0])}catch(e){next(e)}});

adminRouter.get('/support', async(_req,res,next)=>{try{const q=await pool.query(`SELECT t.*,u.name user_name,u.email FROM support_tickets t JOIN users u ON u.id=t.user_id ORDER BY t.created_at DESC`);res.json(q.rows)}catch(e){next(e)}});
adminRouter.post('/support/:id/reply', async(req,res,next)=>{try{const b=z.object({message:z.string().min(1)}).parse(req.body);await tx(async c=>{await c.query('INSERT INTO support_messages(ticket_id,sender_role,sender_id,message) VALUES($1,\'admin\',$2,$3)',[req.params.id,req.auth!.id,b.message]);await c.query('UPDATE support_tickets SET admin_reply=$2,updated_at=now() WHERE id=$1',[req.params.id,b.message]);});await audit(req.auth!.id,'support.reply','support_ticket',req.params.id);res.json({ok:true})}catch(e){next(e)}});
adminRouter.post('/support/:id/status', async(req,res,next)=>{try{const b=z.object({status:z.enum(['open','closed'])}).parse(req.body);await pool.query('UPDATE support_tickets SET status=$2,updated_at=now() WHERE id=$1',[req.params.id,b.status]);await audit(req.auth!.id,'support.status','support_ticket',req.params.id,b);res.json({ok:true})}catch(e){next(e)}});

adminRouter.get('/settings', async(_req,res,next)=>{try{const q=await pool.query('SELECT * FROM settings ORDER BY key');res.json(q.rows)}catch(e){next(e)}});
