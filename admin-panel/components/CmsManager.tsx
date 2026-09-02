'use client';
import {useEffect,useMemo,useState} from 'react';
import {api} from '../lib/api';

type Scope='admin'|'website'|'app';
type Item={id:string;scope:Scope;item_key:string;item_type:string;parent_id?:string|null;title:string;content:any;design:any;behavior:any;validation:any;sort_order:number;is_enabled:boolean;is_deleted:boolean;version:number};
const blank=(scope:Scope)=>({scope,itemKey:'',itemType:'block',parentId:null,title:'',content:{},design:{visible:true},behavior:{},validation:{},sortOrder:0,isEnabled:true});
function pretty(v:any){return JSON.stringify(v??{},null,2)}
function parseJson(label:string,s:string){try{return JSON.parse(s||'{}')}catch{throw new Error(`${label} JSON invalid`)}}

export default function CmsManager({scope}:{scope:Scope}){
 const [items,setItems]=useState<Item[]>([]),[selected,setSelected]=useState<Item|null>(null),[form,setForm]=useState<any>(blank(scope));
 const [content,setContent]=useState('{}'),[design,setDesign]=useState('{}'),[behavior,setBehavior]=useState('{}'),[validation,setValidation]=useState('{}');
 const [msg,setMsg]=useState(''),[showDeleted,setShowDeleted]=useState(false),[query,setQuery]=useState('');
 const load=()=>api(`/admin/cms/${scope}?includeDeleted=${showDeleted}`).then(setItems).catch((e:any)=>setMsg(e.message));
 useEffect(() => { void load(); }, [showDeleted,scope]);
 const visible=useMemo(()=>items.filter(x=>(x.title+' '+x.item_key+' '+x.item_type).toLowerCase().includes(query.toLowerCase())),[items,query]);
 function choose(x:Item){setSelected(x);setForm({itemType:x.item_type,parentId:x.parent_id,title:x.title,sortOrder:x.sort_order,isEnabled:x.is_enabled});setContent(pretty(x.content));setDesign(pretty(x.design));setBehavior(pretty(x.behavior));setValidation(pretty(x.validation));setMsg('')}
 function exportBackup(){const blob=new Blob([JSON.stringify({scope,exportedAt:new Date().toISOString(),items},null,2)],{type:'application/json'});const u=URL.createObjectURL(blob);const a=document.createElement('a');a.href=u;a.download=`${scope}-cms-backup.json`;a.click();URL.revokeObjectURL(u)}
 function fresh(){setSelected(null);setForm(blank(scope));setContent('{}');setDesign('{\n  "visible": true\n}');setBehavior('{}');setValidation('{}');setMsg('New item')}
 async function save(){try{setMsg('Saving...');const payload={...form,scope,content:parseJson('Content',content),design:parseJson('Design',design),behavior:parseJson('Behavior',behavior),validation:parseJson('Validation',validation),sortOrder:Number(form.sortOrder||0),isEnabled:!!form.isEnabled};if(selected){await api(`/admin/cms/items/${selected.id}`,{method:'PATCH',body:JSON.stringify(payload)})}else{if(!form.itemKey)throw new Error('Item key required');await api('/admin/cms/items',{method:'POST',body:JSON.stringify(payload)})}setMsg('Saved');fresh();load()}catch(e:any){setMsg(e.message)}}
 async function toggle(x:Item){await api(`/admin/cms/items/${x.id}/toggle`,{method:'POST',body:JSON.stringify({isEnabled:!x.is_enabled})});load()}
 async function remove(x:Item){await api(`/admin/cms/items/${x.id}`,{method:'DELETE'});load()}
 async function restore(x:Item){await api(`/admin/cms/items/${x.id}/restore`,{method:'POST'});load()}
 async function clone(x:Item){const key=prompt('New unique item key',x.item_key+'.copy');if(!key)return;const title=prompt('New title',x.title+' Copy');if(!title)return;await api(`/admin/cms/${scope}/clone/${x.id}`,{method:'POST',body:JSON.stringify({itemKey:key,title})});load()}
 async function move(x:Item,delta:number){const next=Math.max(0,Number(x.sort_order)+delta);await api(`/admin/cms/items/${x.id}`,{method:'PATCH',body:JSON.stringify({sortOrder:next})});load()}
 return <>
  <div className="top"><div><h1>{scope==='admin'?'Admin CMS':scope==='website'?'Website CMS':'App CMS'}</h1><p>A-to-Z control: content, design, behavior/actions, validation, visibility, order and lifecycle.</p></div><div><button className="button" onClick={()=>load()}>Refresh Existing</button>{' '}<button className="button" onClick={exportBackup}>Export Backup</button>{' '}<button className="button" onClick={fresh}>+ New Item</button></div></div>
  <div className="card"><div className="top"><input style={{maxWidth:420}} placeholder="Search key/title/type" value={query} onChange={e=>setQuery(e.target.value)}/><label><input style={{width:'auto'}} type="checkbox" checked={showDeleted} onChange={e=>setShowDeleted(e.target.checked)}/> Show deleted</label></div></div>
  <div style={{display:'grid',gridTemplateColumns:'minmax(300px,1fr) minmax(360px,1.2fr)',gap:16}}>
   <div>{visible.map(x=><div className="card" key={x.id} style={{opacity:x.is_deleted?.65:1}}><div className="top"><div><b>{x.title}</b><div><code>{x.item_key}</code> · {x.item_type} · v{x.version}</div></div><span>{x.is_enabled?'ON':'OFF'}{x.is_deleted?' · DELETED':''}</span></div><p>Order: {x.sort_order}</p><button className="button" onClick={()=>choose(x)}>Edit</button>{' '}<button className="button" onClick={()=>toggle(x)}>{x.is_enabled?'Disable':'Enable'}</button>{' '}<button className="button" onClick={()=>move(x,-10)}>↑</button>{' '}<button className="button" onClick={()=>move(x,10)}>↓</button>{' '}<button className="button" onClick={()=>clone(x)}>Clone</button>{' '}{x.is_deleted?<button className="button" onClick={()=>restore(x)}>Restore</button>:<button className="button" onClick={()=>remove(x)}>Delete</button>}</div>)}</div>
   <div className="card"><h2>{selected?'Edit Item':'Create Item'}</h2>{!selected&&<><label>Unique Item Key</label><input value={form.itemKey||''} placeholder="page.section.component" onChange={e=>setForm({...form,itemKey:e.target.value})}/></>}<label>Title</label><input value={form.title||''} onChange={e=>setForm({...form,title:e.target.value})}/><label>Type</label><input value={form.itemType||''} placeholder="section/navigation/form/card/action" onChange={e=>setForm({...form,itemType:e.target.value})}/><label>Parent ID (optional)</label><input value={form.parentId||''} onChange={e=>setForm({...form,parentId:e.target.value||null})}/><label>Sort Order</label><input type="number" value={form.sortOrder??0} onChange={e=>setForm({...form,sortOrder:Number(e.target.value)})}/><label><input style={{width:'auto'}} type="checkbox" checked={!!form.isEnabled} onChange={e=>setForm({...form,isEnabled:e.target.checked})}/> Enabled</label><h3>Content JSON</h3><textarea rows={10} value={content} onChange={e=>setContent(e.target.value)}/><h3>Design JSON</h3><textarea rows={8} value={design} onChange={e=>setDesign(e.target.value)}/><h3>Behavior / Actions / Events JSON</h3><textarea rows={8} value={behavior} onChange={e=>setBehavior(e.target.value)}/><h3>Validation / Fields / Options JSON</h3><textarea rows={8} value={validation} onChange={e=>setValidation(e.target.value)}/><button className="button" onClick={save}>{selected?'Update':'Create'}</button>{' '}<button className="button" onClick={fresh}>Reset</button><p>{msg}</p></div>
  </div>
 </>
}
