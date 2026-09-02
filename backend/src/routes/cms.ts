import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db.js';
import { requireAuth, requireAdmin } from '../auth.js';

export const cmsRouter = Router();

const scopeSchema = z.enum(['admin','website','app']);
const itemSchema = z.object({
  scope: scopeSchema,
  itemKey: z.string().min(2).max(160).regex(/^[a-zA-Z0-9._:-]+$/),
  itemType: z.string().min(1).max(80).default('block'),
  parentId: z.string().uuid().nullable().optional(),
  title: z.string().min(1).max(200),
  content: z.record(z.any()).default({}),
  design: z.record(z.any()).default({}),
  behavior: z.record(z.any()).default({}),
  validation: z.record(z.any()).default({}),
  sortOrder: z.number().int().default(0),
  isEnabled: z.boolean().default(true),
});

// Public system status used by Website and Android maintenance screens.
cmsRouter.get('/system/status', async (_req,res,next)=>{
  try{
    const q=await pool.query("SELECT value FROM settings WHERE key='system.maintenance'");
    const cfg=q.rows[0]?.value || {websiteEnabled:false,appEnabled:false,title:'Scheduled Maintenance',message:'We are improving the service. Please try again shortly.',startAt:null,endAt:null,contact:''};
    const now=Date.now(), start=cfg.startAt?Date.parse(cfg.startAt):null, end=cfg.endAt?Date.parse(cfg.endAt):null;
    const scheduledActive=(!start || now>=start) && (!end || now<end);
    res.json({...cfg,websiteActive:!!cfg.websiteEnabled&&scheduledActive,appActive:!!cfg.appEnabled&&scheduledActive,serverTime:new Date().toISOString()});
  }catch(e){next(e)}
});

// Public/client-safe reads. Deleted or disabled items are never exposed.
cmsRouter.get('/cms/:scope', async (req,res,next)=>{
  try {
    const scope=scopeSchema.parse(req.params.scope);
    if(scope==='admin') return res.status(403).json({error:'Admin CMS requires admin authentication'});
    const q=await pool.query(`SELECT id,scope,item_key,item_type,parent_id,title,content,design,behavior,validation,sort_order,version,updated_at
      FROM cms_items WHERE scope=$1 AND is_deleted=false AND is_enabled=true ORDER BY sort_order,created_at`,[scope]);
    res.json(q.rows);
  } catch(e){ next(e); }
});
cmsRouter.get('/cms/:scope/:key', async (req,res,next)=>{
  try {
    const scope=scopeSchema.parse(req.params.scope);
    if(scope==='admin') return res.status(403).json({error:'Admin CMS requires admin authentication'});
    const q=await pool.query(`SELECT id,scope,item_key,item_type,parent_id,title,content,design,behavior,validation,sort_order,version,updated_at
      FROM cms_items WHERE scope=$1 AND item_key=$2 AND is_deleted=false AND is_enabled=true`,[scope,req.params.key]);
    if(!q.rowCount) return res.status(404).json({error:'CMS item not found'});
    res.json(q.rows[0]);
  } catch(e){ next(e); }
});

cmsRouter.use('/admin/cms', requireAuth, requireAdmin);

async function audit(adminId:string, action:string, entityId?:string, metadata:any={}){
  await pool.query('INSERT INTO audit_logs(admin_id,action,entity_type,entity_id,metadata) VALUES($1,$2,\'cms_item\',$3,$4)',[adminId,action,entityId||null,metadata]);
}

cmsRouter.get('/admin/cms/:scope', async(req,res,next)=>{
  try{
    const scope=scopeSchema.parse(req.params.scope);
    const includeDeleted=req.query.includeDeleted==='true';
    const q=await pool.query(`SELECT * FROM cms_items WHERE scope=$1 ${includeDeleted?'':'AND is_deleted=false'} ORDER BY sort_order,created_at`,[scope]);
    res.json(q.rows);
  }catch(e){next(e)}
});

cmsRouter.post('/admin/cms/items', async(req,res,next)=>{
  try{
    const b=itemSchema.parse(req.body);
    const q=await pool.query(`INSERT INTO cms_items(scope,item_key,item_type,parent_id,title,content,design,behavior,validation,sort_order,is_enabled,created_by,updated_by)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$12) RETURNING *`,
      [b.scope,b.itemKey,b.itemType,b.parentId||null,b.title,b.content,b.design,b.behavior,b.validation,b.sortOrder,b.isEnabled,req.auth!.id]);
    await audit(req.auth!.id,'cms.create',q.rows[0].id,{scope:b.scope,itemKey:b.itemKey});
    res.status(201).json(q.rows[0]);
  }catch(e){next(e)}
});

cmsRouter.patch('/admin/cms/items/:id', async(req,res,next)=>{
  try{
    const b=itemSchema.partial().omit({scope:true,itemKey:true}).parse(req.body);
    const fields:any[]=[]; const vals:any[]=[];
    const map:any={itemType:'item_type',parentId:'parent_id',title:'title',content:'content',design:'design',behavior:'behavior',validation:'validation',sortOrder:'sort_order',isEnabled:'is_enabled'};
    for(const [k,col] of Object.entries(map)) if((b as any)[k]!==undefined){vals.push((b as any)[k]);fields.push(`${col}=$${vals.length}`)}
    if(!fields.length) return res.status(400).json({error:'Nothing to update'});
    vals.push(req.auth!.id,req.params.id);
    const q=await pool.query(`UPDATE cms_items SET ${fields.join(',')},updated_by=$${vals.length-1},updated_at=now(),version=version+1 WHERE id=$${vals.length} RETURNING *`,vals);
    if(!q.rowCount) return res.status(404).json({error:'CMS item not found'});
    await audit(req.auth!.id,'cms.update',req.params.id,b);
    res.json(q.rows[0]);
  }catch(e){next(e)}
});

cmsRouter.post('/admin/cms/items/:id/toggle', async(req,res,next)=>{
  try{
    const b=z.object({isEnabled:z.boolean()}).parse(req.body);
    const q=await pool.query('UPDATE cms_items SET is_enabled=$2,updated_by=$3,updated_at=now(),version=version+1 WHERE id=$1 RETURNING *',[req.params.id,b.isEnabled,req.auth!.id]);
    if(!q.rowCount) return res.status(404).json({error:'CMS item not found'});
    await audit(req.auth!.id,'cms.toggle',req.params.id,b); res.json(q.rows[0]);
  }catch(e){next(e)}
});

cmsRouter.delete('/admin/cms/items/:id', async(req,res,next)=>{
  try{
    const q=await pool.query('UPDATE cms_items SET is_deleted=true,updated_by=$2,updated_at=now(),version=version+1 WHERE id=$1 RETURNING *',[req.params.id,req.auth!.id]);
    if(!q.rowCount) return res.status(404).json({error:'CMS item not found'});
    await audit(req.auth!.id,'cms.delete',req.params.id); res.json({deleted:true,item:q.rows[0]});
  }catch(e){next(e)}
});

cmsRouter.post('/admin/cms/items/:id/restore', async(req,res,next)=>{
  try{
    const q=await pool.query('UPDATE cms_items SET is_deleted=false,updated_by=$2,updated_at=now(),version=version+1 WHERE id=$1 RETURNING *',[req.params.id,req.auth!.id]);
    if(!q.rowCount) return res.status(404).json({error:'CMS item not found'});
    await audit(req.auth!.id,'cms.restore',req.params.id); res.json(q.rows[0]);
  }catch(e){next(e)}
});

cmsRouter.post('/admin/cms/:scope/reorder', async(req,res,next)=>{
  try{
    const scope=scopeSchema.parse(req.params.scope);
    const b=z.object({items:z.array(z.object({id:z.string().uuid(),sortOrder:z.number().int()})).min(1)}).parse(req.body);
    const client=await pool.connect();
    try{
      await client.query('BEGIN');
      for(const item of b.items) await client.query('UPDATE cms_items SET sort_order=$3,updated_by=$4,updated_at=now(),version=version+1 WHERE id=$1 AND scope=$2',[item.id,scope,item.sortOrder,req.auth!.id]);
      await client.query('COMMIT');
    }catch(e){await client.query('ROLLBACK');throw e}finally{client.release()}
    await audit(req.auth!.id,'cms.reorder',undefined,{scope,count:b.items.length}); res.json({ok:true});
  }catch(e){next(e)}
});

cmsRouter.post('/admin/cms/:scope/clone/:id', async(req,res,next)=>{
  try{
    const scope=scopeSchema.parse(req.params.scope);
    const b=z.object({itemKey:z.string().min(2).max(160),title:z.string().min(1).max(200)}).parse(req.body);
    const q=await pool.query(`INSERT INTO cms_items(scope,item_key,item_type,parent_id,title,content,design,behavior,validation,sort_order,is_enabled,created_by,updated_by)
      SELECT scope,$3,item_type,parent_id,$4,content,design,behavior,validation,sort_order+1,is_enabled,$5,$5 FROM cms_items WHERE id=$1 AND scope=$2 RETURNING *`,[req.params.id,scope,b.itemKey,b.title,req.auth!.id]);
    if(!q.rowCount) return res.status(404).json({error:'CMS item not found'});
    await audit(req.auth!.id,'cms.clone',q.rows[0].id,{from:req.params.id});res.status(201).json(q.rows[0]);
  }catch(e){next(e)}
});
