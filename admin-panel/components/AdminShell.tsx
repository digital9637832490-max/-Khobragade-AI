'use client';
import {useEffect,useState} from 'react';
import {usePathname} from 'next/navigation';
import {api} from '../lib/api';
const allowed=['dashboard','users','payments','coin-management','ai-tools','maintenance','admin-cms','website-cms','app-cms','audit-logs'];
const labels:Record<string,string>={dashboard:'Dashboard',users:'Users',payments:'Payments', 'coin-management':'Coin Management','ai-tools':'AI Tools',maintenance:'Maintenance','admin-cms':'Admin CMS','website-cms':'Website CMS','app-cms':'App CMS','audit-logs':'Audit Logs'};
export default function Shell({children}:{children:React.ReactNode}){
 const [links,setLinks]=useState<string[]>(allowed); const pathname=usePathname();
 useEffect(()=>{api('/admin/cms/admin').then((rows:any[])=>{const nav=rows.find(x=>x.item_key==='navigation.sidebar');if(Array.isArray(nav?.content?.items)){const clean=allowed.filter(k=>nav.content.items.includes(k));setLinks(clean.length?clean:allowed)}}).catch(()=>{})},[]);
 return <div className="shell"><aside className="side"><h2>Creator Studio Admin</h2><nav className="sideNav">{links.map(x=><a className={pathname===('/'+x)?'active':''} key={x} href={'/'+x}>{labels[x]||String(x).replaceAll('-',' ')}</a>)}<a className="logoutLink" href="/" onClick={()=>localStorage.removeItem('adminToken')}>Logout</a></nav></aside><main className="main">{children}</main></div>
}
