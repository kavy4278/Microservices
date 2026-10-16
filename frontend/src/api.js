const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8085';
const token = () => localStorage.getItem('token');
export async function api(path, opts={}){
  const res = await fetch(BASE+path, { ...opts,
    headers: { 'Content-Type':'application/json', ...(token()?{Authorization:'Bearer '+token()}:{}), ...(opts.headers||{}) } });
  const j = await res.json().catch(()=>({ok:false,error:'bad json'}));
  if(!res.ok || j.ok===false) throw new Error(j.error||('HTTP '+res.status));
  return j.data;
}
export const store = {
  get user(){ try{return JSON.parse(localStorage.getItem('user'));}catch{return null;} },
  set(user,tk){ localStorage.setItem('user',JSON.stringify(user)); localStorage.setItem('token',tk); },
  clear(){ localStorage.removeItem('user'); localStorage.removeItem('token'); }
};
