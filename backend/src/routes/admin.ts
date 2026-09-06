import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { pool, tx } from '../db.js';
import { requireAuth, requireAdmin, signToken } from '../auth.js';
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
  try{const q=await pool.query('SELECT id,name,email,status,created_at FROM users ORDER BY created_at DESC LIMIT 500');res.json(q.rows);}catch(e){next(e)}
});
adminRouter.post('/users/:id/status', async(req,res,next)=>{
  try{
    const b=z.object({status:z.enum(['active','blocked'])}).parse(req.body);
    await pool.query('UPDATE users SET status=$2,updated_at=now() WHERE id=$1',[req.params.id,b.status]);
    await audit(req.auth!.id,'user.status','user',req.params.id,b);
    res.json({ok:true});
  }catch(e){next(e)}
});
adminRouter.get('/reports', async(_req,res,next)=>{
  try{
    const q=await pool.query(`SELECT
      (SELECT count(*) FROM users) total_users,
      (SELECT count(*) FROM users WHERE status='active') active_users,
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

adminRouter.get('/projects', async(_req,res,next)=>{try{const q=await pool.query(`SELECT p.*,u.name user_name,u.email FROM projects p JOIN users u ON u.id=p.user_id ORDER BY p.created_at DESC LIMIT 500`);res.json(q.rows)}catch(e){next(e)}});
adminRouter.get('/jobs', async(_req,res,next)=>{try{const q=await pool.query(`SELECT j.*,u.name user_name,u.email FROM ai_jobs j JOIN users u ON u.id=j.user_id ORDER BY j.created_at DESC LIMIT 500`);res.json(q.rows)}catch(e){next(e)}});
adminRouter.delete('/jobs/:id', async(req,res,next)=>{try{await pool.query(`DELETE FROM ai_jobs WHERE id=$1 AND status IN ('failed','completed')`,[req.params.id]);await audit(req.auth!.id,'job.delete','ai_job',req.params.id);res.json({ok:true})}catch(e){next(e)}});
adminRouter.post('/jobs/:id/block', async(req,res,next)=>{try{await pool.query(`UPDATE ai_jobs SET status='failed',error_message='Blocked by admin',completed_at=now() WHERE id=$1 AND status IN ('pending','processing')`,[req.params.id]);await audit(req.auth!.id,'job.block','ai_job',req.params.id);res.json({ok:true})}catch(e){next(e)}});

adminRouter.post('/notifications', async(req,res,next)=>{try{const b=z.object({userId:z.string().uuid().nullable().optional(),title:z.string().min(1),body:z.string().min(1),type:z.string().default('info')}).parse(req.body);const q=await pool.query('INSERT INTO notifications(user_id,title,body,type) VALUES($1,$2,$3,$4) RETURNING *',[b.userId||null,b.title,b.body,b.type]);await audit(req.auth!.id,'notification.send','notification',q.rows[0].id,b);res.status(201).json(q.rows[0])}catch(e){next(e)}});

adminRouter.get('/support', async(_req,res,next)=>{try{const q=await pool.query(`SELECT t.*,u.name user_name,u.email FROM support_tickets t JOIN users u ON u.id=t.user_id ORDER BY t.created_at DESC`);res.json(q.rows)}catch(e){next(e)}});
adminRouter.post('/support/:id/reply', async(req,res,next)=>{try{const b=z.object({message:z.string().min(1)}).parse(req.body);await tx(async c=>{await c.query('INSERT INTO support_messages(ticket_id,sender_role,sender_id,message) VALUES($1,\'admin\',$2,$3)',[req.params.id,req.auth!.id,b.message]);await c.query('UPDATE support_tickets SET admin_reply=$2,updated_at=now() WHERE id=$1',[req.params.id,b.message]);});await audit(req.auth!.id,'support.reply','support_ticket',req.params.id);res.json({ok:true})}catch(e){next(e)}});
adminRouter.post('/support/:id/status', async(req,res,next)=>{try{const b=z.object({status:z.enum(['open','closed'])}).parse(req.body);await pool.query('UPDATE support_tickets SET status=$2,updated_at=now() WHERE id=$1',[req.params.id,b.status]);await audit(req.auth!.id,'support.status','support_ticket',req.params.id,b);res.json({ok:true})}catch(e){next(e)}});

adminRouter.get('/settings', async(_req,res,next)=>{try{const q=await pool.query('SELECT * FROM settings ORDER BY key');res.json(q.rows)}catch(e){next(e)}});
