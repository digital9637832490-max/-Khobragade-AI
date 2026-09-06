'use client';
import {useEffect,useState} from 'react';
import Shell from '../../components/DashboardShell';
import {api} from '../../lib/api';
const quick=[
 {title:'Khobragade AI',sub:'Ask anything',href:'/chat',icon:'✦'},
 {title:'AI Thumbnail',sub:'Create thumbnail',href:'/ai-thumbnail',icon:'▧'},
 {title:'AI Title',sub:'Generate titles',href:'/ai-title',icon:'T'},
 {title:'Image & Video',sub:'Create visual content',href:'/photo-video',icon:'▶'},
];
export default function Dashboard(){
 const[me,setMe]=useState<any>({});
 useEffect(()=>{api('/auth/me').then(setMe).catch(()=>{})},[]);
 return <Shell><div className="dashHeader"><div><span className="dashEyebrow">KHOBRAGADE AI</span><h1>Khobragade AI</h1><p>Welcome, {me.name||'Creator'}. Start chatting or create content.</p></div><a className="button" href="/chat">✨ Open Chat</a></div>
 <section className="dashSection"><div className="sectionTitle"><div><h2>Quick Actions</h2><p>Everything important, without a recharge flow.</p></div></div><div className="dashCards">{quick.map((x,i)=><a className="dashCard" data-color={i%7} href={x.href} key={x.title}><div className="dashCardIcon">{x.icon}</div><div><h3>{x.title}</h3><p>{x.sub}</p></div><span className="cardArrow">›</span></a>)}</div></section>
 <section className="miniStats"><a href="/projects"><small>Projects</small><b>Open projects</b></a><a href="/notifications"><small>Notifications</small><b>View updates</b></a><a href="/support"><small>Support</small><b>Get help</b></a><a href="/profile"><small>Profile</small><b>Account settings</b></a></section></Shell>}
