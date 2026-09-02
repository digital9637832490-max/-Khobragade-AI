const API=process.env.NEXT_PUBLIC_API_BASE_URL || process.env.API_BASE_URL || 'http://localhost:4000/api';
export async function cms(scope:'website'|'app',key:string){
 try{const r=await fetch(`${API}/cms/${scope}/${encodeURIComponent(key)}`,{next:{revalidate:30}});if(!r.ok)return null;return await r.json()}catch{return null}
}
