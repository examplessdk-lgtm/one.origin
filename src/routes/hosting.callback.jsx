import {createFileRoute,useNavigate,Link} from '@tanstack/react-router';
import {useEffect,useRef,useState} from 'react';
import {getOriginRuntime} from '@/lib/origin/runtime';
export const Route=createFileRoute('/hosting/callback')({ssr:false,component:Callback});
function Callback(){
 const started=useRef(false),navigate=useNavigate();const [message,setMessage]=useState('Verifying sign-in…');
 useEffect(()=>{
  if(started.current)return;started.current=true;
  const search=window.location.search;
  window.history.replaceState(window.history.state,'',window.location.pathname);
  void getOriginRuntime().auth.complete(search).then(result=>navigate({to:result.returnTo,replace:true})).catch(error=>setMessage(error.message||'Sign-in failed.'));
 },[navigate]);
 return <div className="max-w-2xl mx-auto p-6 py-16"><h1 className="text-3xl font-bold">Sign in to ONEORIGIN</h1><p role="status" className="mt-5 text-muted-foreground">{message}</p><Link to="/hosting" className="inline-block mt-8 text-accent">Back to Hosting →</Link></div>;
}
