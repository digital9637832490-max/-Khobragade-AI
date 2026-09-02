'use client';
import {useEffect,useState} from 'react';
import Shell from '../../components/DashboardShell';
import {api} from '../../lib/api';
const quick=[
 {title:'Khobragade AI',sub:'Ask anything',href:'/chat',icon:'✦'},
 {title:'AI Thumbnail',sub:'Create thumbnail',href:'/ai-thumbnail',icon:'▧'},
 {title:'AI Title',sub:'Generate titles',href:'/ai-title',icon:'T'},
 {title:'Photo → Video',sub:'Create video',href:'/photo-video',icon:'▶'},
];
export default function Dashboard(){
 const[me,setMe]=useState<any>({});const[wallet,setWallet]=useState<any>({coinBalance:0});
 useEffect(()=>{api('/auth/me').then(setMe).catch(()=>{});api('/wallet').then(setWallet).catch(()=>{})},[]);
 return <Shell><div className="dashHeader"><div><span className="dashEyebrow">KHOBRAGADE AI</span><h1>Dashboard</h1><p>Welcome, {me.name||'Creator'}. Everything important is here.</p></div><a className="dashCoin" href="/coins"><span>◉</span><div><small>Coin Balance</small><b>{wallet.coinBalance}</b></div></a></div>
 <section className="dashSection"><div className="sectionTitle"><div><h2>Quick Actions</h2><p>Start your most-used tools.</p></div></div><div className="dashCards">{quick.map((x,i)=><a className="dashCard" data-color={i%7} href={x.href} key={x.title}><div className="dashCardIcon">{x.icon}</div><div><h3>{x.title}</h3><p>{x.sub}</p></div><span className="cardArrow">›</span></a>)}</div></section>
 <section className="miniStats"><a href="/transactions"><small>Transactions</small><b>View history</b></a><a href="/projects"><small>Projects</small><b>Open projects</b></a><a href="/notifications"><small>Notifications</small><b>View updates</b></a><a href="/support"><small>Support</small><b>Get help</b></a></section></Shell>
}
