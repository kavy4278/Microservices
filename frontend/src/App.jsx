import React, { useEffect, useState } from 'react';
import { api, store } from './api.js';

const def = () => { const d=new Date(Date.now()+4*3600*1000); return d.toISOString().slice(0,16); };

function Auth({ onAuth }){
  const [m,setM]=useState('login');
  const [f,setF]=useState({name:'',email:'',password:'',role:'donor',org:''});
  const [err,setErr]=useState('');
  const go=async(e)=>{e.preventDefault();setErr('');
    try{
      const data = m==='login'
        ? await api('/api/auth/login',{method:'POST',body:JSON.stringify({email:f.email,password:f.password})})
        : await api('/api/auth/register',{method:'POST',body:JSON.stringify(f)});
      store.set(data.user,data.token); onAuth(data.user);
    }catch(e){setErr(e.message);}
  };
  return <div className="card" style={{maxWidth:420,margin:'40px auto'}}>
    <h2>🍛 AnnBachao {m==='login'?'Login':'Register'}</h2>
    <div className="tabs"><button className="ghost" onClick={()=>setM('login')}>Login</button><button className="ghost" onClick={()=>setM('register')}>Register</button></div>
    <form onSubmit={go}>
      {m==='register'&&<><input placeholder="Name *" value={f.name} onChange={e=>setF({...f,name:e.target.value})}/><input placeholder="Org (restaurant/NGO)" value={f.org} onChange={e=>setF({...f,org:e.target.value})}/><select value={f.role} onChange={e=>setF({...f,role:e.target.value})}><option value="donor">Donor</option><option value="ngo">NGO</option><option value="rider">Rider</option><option value="admin">Admin</option></select></>}
      <input placeholder="Email *" value={f.email} onChange={e=>setF({...f,email:e.target.value})}/><input type="password" placeholder="Password * (min 6)" value={f.password} onChange={e=>setF({...f,password:e.target.value})}/>
      {err&&<p style={{color:'red'}}>{err}</p>}
      <button type="submit">{m==='login'?'Login':'Create account'}</button>
    </form>
    <p className="mut">Demo: donor@test.com/donor123, ngo@test.com/ngo123, rider@test.com/rider123 — register first.</p>
  </div>;
}

function Post({ refresh }){
  const [f,setF]=useState({title:'Veg Biryani x40',qty:40,veg:true,cookedAt:new Date().toISOString().slice(0,16),expiryAt:def(),city:'Jaipur',address:'MI Road',photoUrl:''});
  const [msg,setMsg]=useState('');
  const submit=async(e)=>{e.preventDefault();setMsg('');
    try{await api('/api/listings',{method:'POST',body:JSON.stringify({...f,qty:Number(f.qty),cookedAt:new Date(f.cookedAt).toISOString(),expiryAt:new Date(f.expiryAt).toISOString()})});setMsg('Posted!');refresh();}catch(e){setMsg('Error: '+e.message);}};
  return <form className="card" onSubmit={submit}><h3>Post surplus food</h3>
    <input value={f.title} onChange={e=>setF({...f,title:e.target.value})} placeholder="Title *"/>
    <div className="row"><input type="number" value={f.qty} onChange={e=>setF({...f,qty:e.target.value})} placeholder="Servings *"/><select value={f.veg} onChange={e=>setF({...f,veg:e.target.value==='true'})}><option value="true">Veg</option><option value="false">Non-veg</option></select></div>
    <div className="row"><label className="mut">Cooked<input type="datetime-local" value={f.cookedAt} onChange={e=>setF({...f,cookedAt:e.target.value})}/></label><label className="mut">Expiry<input type="datetime-local" value={f.expiryAt} onChange={e=>setF({...f,expiryAt:e.target.value})}/></label></div>
    <div className="row"><input value={f.city} onChange={e=>setF({...f,city:e.target.value})} placeholder="City *"/><input value={f.address} onChange={e=>setF({...f,address:e.target.value})} placeholder="Pickup address *"/></div>
    <button>Post</button> <span className="mut">{msg}</span></form>;
}

function Cards({ items, onClaim, showOtp, onDel }){
  if(!items.length) return <p className="mut">No food yet — post first.</p>;
  return <div className="grid">{items.map(l=>{
    const hrs = Math.max(0,(new Date(l.expiryAt)-Date.now())/3600e3);
    return <div className="card" key={l._id}>
      <b>{l.title}</b> <span className={'pill '+l.status}>{l.status}</span>
      <p className="mut">{l.qty} servings • {l.veg?'Veg':'Non-veg'} • {l.city}</p>
      <p className="mut">{l.address} • expires {new Date(l.expiryAt).toLocaleString()} ({hrs.toFixed(1)}h left)</p>
      {showOtp&&l.otp&&<p>OTP: <span className="otp">{l.otp}</span></p>}
      <div className="row">{onClaim&&l.status==='POSTED'&&<button onClick={()=>onClaim(l._id)}>Claim</button>}{onDel&&<button className="danger" onClick={()=>onDel(l._id)}>Delete</button>}</div>
    </div>;})}</div>;
}

export default function App(){
  const [user,setUser]=useState(store.user);
  const [tab,setTab]=useState('browse');
  const [list,setList]=useState([]); const [claims,setClaims]=useState([]); const [notes,setNotes]=useState([]); const [msg,setMsg]=useState('');
  const [q,setQ]=useState({city:'',veg:''});
  const load=async()=>{
    try{
      const qs = new URLSearchParams({available:tab==='browse'?'1':'',city:q.city,veg:q.veg}).toString();
      const L = tab==='mine' ? await api('/api/listings?mine=1') : await api('/api/listings?'+qs);
      setList(L);
    }catch(e){setMsg(e.message);}
    try{ setClaims(await api('/api/claims')); }catch{}
    try{ setNotes(await api('/api/notify')); }catch{}
  };
  useEffect(()=>{ if(user) load(); },[user,tab]);
  if(!user) return <div><div className="nav"><b>🍛 AnnBachao</b></div><div className="wrap"><Auth onAuth={setUser}/></div></div>;
  const claim=async(id)=>{ try{const r=await api('/api/claims',{method:'POST',body:JSON.stringify({listingId:id})});alert('Claimed! OTP: '+r.otp);load();}catch(e){alert(e.message);}};
  const del=async(id)=>{ if(!confirm('Delete?'))return; await api('/api/listings/'+id,{method:'DELETE'}); load(); };
  const pickup=async(c)=>{ const otp=prompt('Enter 4-digit OTP from donor:'); if(!otp)return; try{await api('/api/claims/'+c._id+'/pickup',{method:'PATCH',body:JSON.stringify({otp})});load();}catch(e){alert(e.message);}};
  const deliver=async(c)=>{ await api('/api/claims/'+c._id+'/deliver',{method:'PATCH'}); load(); };
  const saved = claims.filter(c=>c.status==='DELIVERED').reduce((a,c)=>a+(c.qty||0),0);
  return <div><div className="nav"><span><b>🍛 AnnBachao</b><span className="badge">{user.role}</span></span><span>{user.name} <button className="ghost" style={{marginLeft:8}} onClick={()=>{store.clear();setUser(null);}}>Logout</button></span></div>
  <div className="wrap">
    <div className="tabs">
      <button className="ghost" onClick={()=>setTab('browse')}>Browse</button>
      {(user.role==='donor'||user.role==='admin')&&<button className="ghost" onClick={()=>setTab('post')}>Post</button>}
      {(user.role==='donor'||user.role==='admin')&&<button className="ghost" onClick={()=>setTab('mine')}>My listings</button>}
      <button className="ghost" onClick={()=>setTab('claims')}>Claims/Pickups</button>
      <button className="ghost" onClick={()=>setTab('board')}>Leaderboard</button>
    </div>
    {msg&&<p style={{color:'red'}}>{msg}</p>}
    {tab==='post'&&<Post refresh={()=>setTab('mine')}/>}
    {tab==='browse'&&<><div className="row"><input style={{maxWidth:200}} placeholder="City filter" value={q.city} onChange={e=>setQ({...q,city:e.target.value})}/><select style={{maxWidth:160}} value={q.veg} onChange={e=>setQ({...q,veg:e.target.value})}><option value="">All</option><option value="true">Veg only</option></select><button onClick={load}>Search</button></div><Cards items={list} onClaim={(user.role==='ngo'||user.role==='admin')?claim:null}/></>}
    {tab==='mine'&&<Cards items={list} showOtp onDel={del}/>}
    {tab==='claims'&&<div className="grid">{claims.length?claims.map(c=><div className="card" key={c._id}><b>{c.listingTitle}</b> <span className={'pill '+c.status}>{c.status}</span><p className="mut">{c.qty} servings • {c.city} • OTP: <span className="otp">{c.otp}</span></p><div className="row">{c.status==='CLAIMED'&&<button onClick={()=>pickup(c)}>Pickup with OTP</button>}{c.status==='PICKED_UP'&&<button onClick={()=>deliver(c)}>Mark delivered</button>}</div></div>):<p className="mut">No claims yet.</p>}</div>}
    {tab==='board'&&<div className="card"><h3>🏆 {saved} servings saved</h3><p className="mut">Delivered claims: {claims.filter(c=>c.status==='DELIVERED').length}</p><h4>Activity</h4>{notes.map(n=><p key={n._id} className="mut">{n.message||n.type} • {new Date(n.createdAt).toLocaleString()}</p>)}</div>}
  </div></div>;
}
