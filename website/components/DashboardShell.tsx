'use client';
import {useEffect,useMemo,useState} from 'react';
import {API} from '../lib/api';

const allowed=['chat','dashboard','coins','transactions','projects','notifications','support','profile'];
const labels:Record<string,string>={chat:'✨ Khobragade AI',dashboard:'Dashboard',coins:'Coins / Recharge',transactions:'Transactions',projects:'Projects',notifications:'Notifications',support:'Support',profile:'Profile'};
const icons:Record<string,string>={chat:'✦',dashboard:'⌂',coins:'◉',transactions:'↔',projects:'▣',notifications:'●',support:'?',profile:'☺'};

export default function Shell({children}:{children:React.ReactNode}){
 const [cmsLinks,setCmsLinks]=useState<string[]>(allowed),[maintenance,setMaintenance]=useState<any>(null),[now,setNow]=useState(Date.now());
 useEffect(()=>{
  fetch(API+'/cms/website/dashboard.navigation').then(r=>r.ok?r.json():null).then(x=>{if(Array.isArray(x?.content?.items))setCmsLinks(x.content.items)}).catch(()=>{});
  fetch(API+'/system/status').then(r=>r.json()).then(setMaintenance).catch(()=>{});
  const t=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(t)
 },[]);
 const links=useMemo(()=>{const picked=cmsLinks.filter(x=>allowed.includes(String(x)));return picked.length?[...new Set(picked)]:allowed},[cmsLinks]);
 const path=typeof window!=='undefined'?window.location.pathname:'';
 if(maintenance?.websiteActive){const left=maintenance.endAt?Math.max(0,Date.parse(maintenance.endAt)-now):0,h=Math.floor(left/3600000),m=Math.floor(left%3600000/60000),sec=Math.floor(left%60000/1000);return <div className="maintenanceScreen"><div className="maintenanceCard"><div className="maintenanceOrb">🛠️</div><h1>{maintenance.title||'Scheduled Maintenance'}</h1><p>{maintenance.messageHi||maintenance.message}</p>{maintenance.endAt&&<h2>⏳ {String(h).padStart(2,'0')}:{String(m).padStart(2,'0')}:{String(sec).padStart(2,'0')}</h2>}{maintenance.contact&&<p>{maintenance.contact}</p>}<button onClick={()=>location.reload()}>Try Again</button></div></div>}
 return <div className="shell dashboardShell"><aside className="side proSide"><div className="sideBrand"><div className="brandLogo">✦</div><div><b>Khobragade AI</b><small>User Panel</small></div></div><nav className="sideNav">{links.map((x,i)=><a key={x} className={path==='/' + x||path.startsWith('/'+x+'/')?'active':''} data-color={i%7} href={'/'+x}><span className="sideIcon">{icons[x]||'•'}</span><span>{labels[x]||x}</span></a>)}</nav><a className="sideLogout" href="/login" onClick={()=>localStorage.removeItem('token')}><span>↪</span> Logout</a></aside><main className="main dashboardMain">{children}</main></div>
}
