'use client';
import {useEffect,useState} from 'react';
import {usePathname} from 'next/navigation';
import {API} from '../lib/api';

const allowed=['chat','dashboard','coins','transactions','notifications','support','profile'];
const labels:Record<string,string>={chat:'✨ Khobragade AI',dashboard:'Dashboard',coins:'Coins / Recharge',transactions:'Transactions',notifications:'Notifications',support:'Support',profile:'Profile'};
export default function Shell({children}:{children:React.ReactNode}){
 const [links,setLinks]=useState<string[]>(allowed),[maintenance,setMaintenance]=useState<any>(null),[now,setNow]=useState(Date.now());
 const pathname=usePathname();
 useEffect(()=>{fetch(API+'/cms/website/dashboard.navigation').then(r=>r.ok?r.json():null).then(x=>{if(Array.isArray(x?.content?.items)){const clean=allowed.filter(k=>x.content.items.includes(k));setLinks(clean.length?clean:allowed)}}).catch(()=>{});fetch(API+'/system/status').then(r=>r.json()).then(setMaintenance).catch(()=>{});const t=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(t)},[]);
 if(maintenance?.websiteActive){const left=maintenance.endAt?Math.max(0,Date.parse(maintenance.endAt)-now):0,h=Math.floor(left/3600000),m=Math.floor(left%3600000/60000),sec=Math.floor(left%60000/1000);return <div className="maintenanceScreen"><div className="maintenanceCard"><div className="maintenanceOrb">🛠️</div><h1>{maintenance.title||'Scheduled Maintenance'}</h1><p>{maintenance.messageHi||maintenance.message}</p>{maintenance.endAt&&<h2>⏳ {String(h).padStart(2,'0')}:{String(m).padStart(2,'0')}:{String(sec).padStart(2,'0')}</h2>}{maintenance.contact&&<p>{maintenance.contact}</p>}<button onClick={()=>location.reload()}>Try Again</button></div></div>}
 return <div className="shell"><aside className="side"><h2><span className="brandMark">✦</span> Creator Studio</h2><nav className="sideNav">{links.map(x=><a className={pathname===('/'+x)?'active':''} key={x} href={'/'+x}>{labels[x]||x.replaceAll('-',' ')}</a>)}<a className="logoutLink" href="/login" onClick={()=>localStorage.removeItem('token')}>Logout</a></nav></aside><main className="main">{children}</main></div>
}
