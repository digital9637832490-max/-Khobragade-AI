'use client';
import {useEffect,useState} from 'react';
import {API} from '../lib/api';
const fallback=['dashboard','ai-thumbnail','ai-title','ai-description','ai-tags','photo-video','voice-over','projects','coins','transactions','notifications','support','profile'];
export default function Shell({children}:{children:React.ReactNode}){const[links,setLinks]=useState<string[]>(fallback);useEffect(()=>{fetch(API+'/cms/website/dashboard.navigation').then(r=>r.ok?r.json():null).then(x=>{if(Array.isArray(x?.content?.items))setLinks(x.content.items)}).catch(()=>{})},[]);return <div className="shell"><aside className="side"><h2>Creator Studio</h2>{links.map(x=><a key={x} href={'/'+x}>{x.replaceAll('-',' ')}</a>)}<a href="/login" onClick={()=>localStorage.removeItem('token')}>Logout</a></aside><main className="main">{children}</main></div>}
