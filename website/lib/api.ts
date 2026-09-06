export const API=process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api';

async function requestWithTimeout(path:string, options:RequestInit={}, timeoutMs=45000){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{return await fetch(API+path,{...options,signal:controller.signal});}
  catch(e:any){if(e?.name==='AbortError')throw new Error('Server response timed out. Please try again.');throw e;}
  finally{clearTimeout(timer);}
}

export async function api(path:string, options:RequestInit={}){
  const token=typeof window!=='undefined'?localStorage.getItem('token'):null;
  const r=await requestWithTimeout(path,{...options,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{ }),...(options.headers||{})}});
  const data=await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(data.error||data.message||'Request failed');
  return data;
}

export async function apiBlob(path:string, options:RequestInit={}){
  const token=typeof window!=='undefined'?localStorage.getItem('token'):null;
  const r=await requestWithTimeout(path,{...options,headers:{...(token?{Authorization:`Bearer ${token}`}:{ }),...(options.headers||{})}});
  if(!r.ok){let message='Request failed';try{const data=await r.json();message=data.error||message}catch{}throw new Error(message)}
  return r.blob();
}
