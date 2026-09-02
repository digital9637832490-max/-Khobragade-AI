'use client';
import {useEffect,useState} from 'react';
import {api} from '../lib/api';
const fallback=['dashboard','users','payments','coin-management','ai-tools','projects','reports','notifications','support','audit-logs','maintenance','admin-cms','website-cms','app-cms'];
export default function Shell({children}:{children:React.ReactNode}){
 const [links,setLinks]=useState<string[]>(fallback);
 useEffect(()=>{api('/admin/cms/admin').then((rows:any[])=>{const nav=rows.find(x=>x.item_key==='navigation.sidebar');if(Array.isArray(nav?.content?.items))setLinks(nav.content.items)}).catch(()=>{})},[]);
 return <div className="shell"><aside className="side"><h2>Creator Studio Admin</h2>{links.map(x=><a key={x} href={'/'+x}>{String(x).replaceAll('-',' ')}</a>)}<a href="/" onClick={()=>localStorage.removeItem('adminToken')}>Logout</a></aside><main className="main">{children}</main></div>
}
