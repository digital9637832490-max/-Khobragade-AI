export const API=process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api';
export async function api(path:string, options:RequestInit={}){
  const token=typeof window!=='undefined'?localStorage.getItem('token'):null;
  const r=await fetch(API+path,{...options,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{ }),...(options.headers||{})}});
  const data=await r.json(); if(!r.ok) throw new Error(data.error||'Request failed'); return data;
}

export async function apiBlob(path:string, options:RequestInit={}){const token=typeof window!=='undefined'?localStorage.getItem('token'):null;const r=await fetch(API+path,{...options,headers:{...(token?{Authorization:`Bearer ${token}`}:{ }),...(options.headers||{})}});if(!r.ok){let message='Request failed';try{const data=await r.json();message=data.error||message}catch{}throw new Error(message)}return r.blob();}
