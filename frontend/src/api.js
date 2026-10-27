const RAW_BASE = import.meta.env.VITE_API_URL;
// Build with VITE_API_URL= (empty) when the API is served same-origin behind the ingress.
export const API_BASE = (RAW_BASE === undefined ? 'http://localhost:8085' : RAW_BASE).replace(/\/+$/, '');
const BASE = API_BASE;
const token = () => localStorage.getItem('token');
export function eventStreamUrl(){
  const tk = token();
  return tk ? `${BASE}/api/notify/stream?token=${encodeURIComponent(tk)}` : null;
}
export async function api(path, opts={}){
  let res;
  try {
    res = await fetch(BASE+path, { ...opts,
      headers: { 'Content-Type':'application/json', ...(token()?{Authorization:'Bearer '+token()}:{}), ...(opts.headers||{}) } });
  } catch (e) {
    // fetch only rejects on network failure — every action would otherwise show a bare "Failed to fetch"
    throw new Error(`Cannot reach the API at ${BASE}. Start the port-forwards with: scripts\\k8s-deploy.ps1 -Expose`);
  }
  const j = await res.json().catch(()=>({ok:false,error:'bad json'}));
  if(!res.ok || j.ok===false) throw new Error(j.error||('HTTP '+res.status));
  return j.data;
}
export const store = {
  get user(){ try{return JSON.parse(localStorage.getItem('user'));}catch{return null;} },
  set(user,tk){ localStorage.setItem('user',JSON.stringify(user)); localStorage.setItem('token',tk); },
  clear(){ localStorage.removeItem('user'); localStorage.removeItem('token'); }
};
