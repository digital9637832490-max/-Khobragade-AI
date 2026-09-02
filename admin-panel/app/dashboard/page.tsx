'use client';
import {useEffect,useState} from 'react';
import Shell from '../../components/AdminShell';
import {api} from '../../lib/api';
const fallback=['total_users','active_users','pending_payments','approved_payments','total_revenue','coins_sold','coins_used','ai_generations','video_jobs','failed_jobs'];
const icons=['♟','✓','⌛','₹','◆','◉','↗','✦','▶','!'];
export default function Page(){
 const[r,setR]=useState<any>({}),[fields,setFields]=useState<string[]>(fallback),[maint,setMaint]=useState<any>({});
 useEffect(()=>{api('/admin/reports').then(setR).catch(()=>{});api('/admin/cms/admin').then((rows:any[])=>{const x=rows.find(y=>y.item_key==='dashboard.cards');if(Array.isArray(x?.content?.fields))setFields(x.content.fields)}).catch(()=>{});api('/admin/settings').then((rows:any[])=>setMaint(rows.find(x=>x.key==='system.maintenance')?.value||{})).catch(()=>{})},[]);
 return <Shell><div className="dashHeader"><div><span className="dashEyebrow">KHOBRAGADE AI ADMIN</span><h1>Dashboard</h1><p>Overview of users, payments, AI activity and system controls.</p></div><div className={'statusPill '+(maint.websiteEnabled||maint.appEnabled?'warn':'ok')}><span></span>{maint.websiteEnabled||maint.appEnabled?'Maintenance Active':'System Online'}</div></div>
 <section className="adminStats">{fields.map((k,i)=><div className="statCard" data-color={i%7} key={k}><div className="statIcon">{icons[i%icons.length]}</div><div><small>{k.replaceAll('_',' ')}</small><h2>{String(r[k]??0)}</h2></div></div>)}</section>
 <section className="adminBottom"><div className="systemCard"><div><small>Maintenance</small><h3>{maint.websiteEnabled||maint.appEnabled?'Active / Scheduled':'Off'}</h3><p>Website: {maint.websiteEnabled?'ON':'OFF'} · App: {maint.appEnabled?'ON':'OFF'}</p></div><a className="button" href="/maintenance">Manage</a></div><div className="systemCard"><div><small>Content Management</small><h3>CMS Controls</h3><p>Manage admin, website and app content.</p></div><div className="miniLinks"><a href="/admin-cms">Admin</a><a href="/website-cms">Website</a><a href="/app-cms">App</a></div></div></section></Shell>
}
