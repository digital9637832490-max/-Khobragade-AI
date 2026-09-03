'use client';
import {useEffect,useMemo,useState} from 'react';
import {api} from '../lib/api';
const allowed=['dashboard','users','payments','coin-management','ai-tools','projects','reports','notifications','support','audit-logs','maintenance','admin-cms','website-cms','app-cms'];
const labels:Record<string,string>={dashboard:'Dashboard',users:'Users',payments:'Payments','coin-management':'Coin Management','ai-tools':'AI Tools',projects:'Projects',reports:'Reports',notifications:'Notifications',support:'Support','audit-logs':'Audit Logs',maintenance:'Maintenance','admin-cms':'Admin CMS','website-cms':'Website CMS','app-cms':'App CMS'};
const icons:Record<string,string>={dashboard:'⌂',users:'♟',payments:'₹','coin-management':'◉','ai-tools':'✦',projects:'▣',reports:'▥',notifications:'●',support:'?', 'audit-logs':'≡',maintenance:'⚙','admin-cms':'A','website-cms':'W','app-cms':'▯'};
export default function Shell({children}:{children:React.ReactNode}){
 const [cmsLinks,setCmsLinks]=useState<string[]>(allowed);
 useEffect(()=>{api('/admin/cms/admin').then((rows:any[])=>{const nav=rows.find(x=>x.item_key==='navigation.sidebar');if(Array.isArray(nav?.content?.items))setCmsLinks(nav.content.items)}).catch(()=>{})},[]);
 const links=useMemo(()=>{const picked=cmsLinks.filter(x=>allowed.includes(String(x)));return picked.length?[...new Set(picked)]:allowed},[cmsLinks]);
 const path=typeof window!=='undefined'?window.location.pathname:'';
 return <div className="shell dashboardShell"><aside className="side proSide"><div className="sideBrand"><div className="brandLogo"><img src="/khobragade-ai-logo.png" alt="Khobragade AI logo"/></div><div><b>Khobragade AI</b><small>Admin Panel</small></div></div><nav className="sideNav">{links.map((x,i)=><a key={x} className={path==='/' + x||path.startsWith('/'+x+'/')?'active':''} data-color={i%7} href={'/'+x}><span className="sideIcon">{icons[x]||'•'}</span><span>{labels[x]||x}</span></a>)}</nav><a className="sideLogout" href="/" onClick={()=>localStorage.removeItem('adminToken')}><span>↪</span> Logout</a></aside><main className="main dashboardMain">{children}</main></div>
}
