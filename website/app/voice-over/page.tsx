'use client';
import {useState} from 'react';
import Shell from '../../components/DashboardShell';
import {api} from '../../lib/api';

const voices=['Kore','Puck','Charon','Fenrir','Aoede'];
const wait=(ms:number)=>new Promise(r=>setTimeout(r,ms));

export default function Page(){
  const[text,setText]=useState('');
  const[voice,setVoice]=useState('Kore');
  const[style,setStyle]=useState('natural');
  const[msg,setMsg]=useState('');
  const[audio,setAudio]=useState('');
  const[busy,setBusy]=useState(false);

  async function go(){
    if(!text.trim())return;
    setBusy(true);setAudio('');setMsg('Generating voice…');
    try{
      const job=await api('/ai/voiceover',{method:'POST',body:JSON.stringify({text,voice,style})});
      for(let i=0;i<90;i++){
        await wait(1500);
        const j=await api(`/jobs/${job.id}`);
        if(j.status==='completed'){
          const url=j.result?.audioDataUrl||'';
          if(!url)throw new Error('Voice generated but audio is missing');
          setAudio(url);setMsg('Voice-over ready');setBusy(false);return;
        }
        if(j.status==='failed')throw new Error(j.error_message||'Voice generation failed');
      }
      throw new Error('Voice generation is taking too long. Please try again.');
    }catch(e:any){setMsg(e.message);setBusy(false)}
  }

  return <Shell>
    <h1>Gemini Voice-over</h1>
    <div className="card" style={{maxWidth:820}}>
      <p><b>Free Gemini TTS</b> · 3 free generations/day, then your configured coin charge.</p>
      <textarea style={{minHeight:180}} placeholder="Hindi, Marathi or English voice-over text…" value={text} onChange={e=>setText(e.target.value)}/>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,margin:'12px 0'}}>
        <label>Voice<select value={voice} onChange={e=>setVoice(e.target.value)}>{voices.map(v=><option key={v}>{v}</option>)}</select></label>
        <label>Style<select value={style} onChange={e=>setStyle(e.target.value)}><option>natural</option><option>cheerful</option><option>energetic</option><option>calm</option><option>professional</option></select></label>
      </div>
      <button className="button" disabled={busy||!text.trim()} onClick={go}>{busy?'Generating…':'Generate Voice'}</button>
      <p>{msg}</p>
      {audio&&<div style={{marginTop:16}}><audio controls src={audio} style={{width:'100%'}}/><div style={{marginTop:10}}><a className="button" href={audio} download="creator-studio-voice.wav">Download WAV</a></div></div>}
    </div>
  </Shell>;
}
