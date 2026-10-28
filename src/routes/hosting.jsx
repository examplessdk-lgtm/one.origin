import {createFileRoute} from '@tanstack/react-router';
import {useEffect,useState} from 'react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {getOriginRuntime,originConfig} from '@/lib/origin/runtime';
import {Github,Play,RefreshCw,ExternalLink,Download} from 'lucide-react';
export const Route=createFileRoute('/hosting')({ssr:false,head:()=>({meta:[{title:'Hosting — ONEORIGIN'}]}),component:Hosting});
function Hosting(){
  const [session,setSession]=useState(null),[branch,setBranch]=useState('main'),[repo,setRepo]=useState('examplessdk-lgtm/1origin');
  const [builds,setBuilds]=useState([]),[status,setStatus]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const [source,setSource]=useState(null),[path,setPath]=useState(''),[content,setContent]=useState(''),[logs,setLogs]=useState('');
  function fail(e){setError(e instanceof Error?e.message:'Request failed.');}
  async function history(){try{setBuilds((await getOriginRuntime().client.previews()).builds||[])}catch(e){fail(e)}}
  useEffect(()=>{
    if(!originConfig.enabled)return;
    const {auth,client}=getOriginRuntime();setSession(auth.getSession());
    void client.status().then(setStatus).catch(fail);
    if(auth.getSession())void history();
    const timer=setInterval(()=>{const current=auth.getSession();setSession(current);if(current)void history();else{setBuilds([]);setSource(null);setContent('');setLogs('')}},10000);
    return()=>clearInterval(timer);
  },[]);
  async function signIn(){try{await getOriginRuntime().auth.signIn('/hosting')}catch(e){fail(e)}}
  async function start(){
    if(!session){await signIn();return}
    if(!session.operator)return;
    if(!window.confirm('Create a public AWS preview of the connected 1origin Nuxt project? AWS usage charges apply.'))return;
    setBusy(true);setError('');
    try{await getOriginRuntime().client.startPreview(crypto.randomUUID(),branch.trim()||'main');await history()}
    catch(e){setError((e.message||'Build request failed.')+' Refresh history before starting another job; AWS may already have accepted it.')}
    finally{setBusy(false)}
  }
  async function importRepository(){
    setBusy(true);setError('');setSource(null);setContent('');
    try{setSource(await getOriginRuntime().client.importRepository(repo.trim(),branch.trim()))}catch(e){fail(e)}finally{setBusy(false)}
  }
  async function openFile(file){
    setBusy(true);setError('');
    try{const data=await getOriginRuntime().client.readFile(source.repository.fullName,source.repository.commitSha,file.path);setPath(file.path);setContent(data.content)}catch(e){fail(e)}finally{setBusy(false)}
  }
  async function readLogs(id){try{setLogs((await getOriginRuntime().client.previewLogs(id)).events.map(e=>e.message).join('')||'No log events yet.')}catch(e){fail(e)}}
  function download(){const url=URL.createObjectURL(new Blob([content],{type:'text/plain;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download=path.split('/').pop()||'source.txt';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
  const active=builds.some(b=>b.status==='IN_PROGRESS');
  return <div className="w-full min-w-0 max-w-6xl mx-auto px-4 sm:px-6 py-12 md:py-16 space-y-8 [overflow-wrap:anywhere]">
    <div><p className="text-[10px] tracking-[0.3em] font-bold text-accent mb-3">GITHUB → BUILD → PREVIEW → LOGS</p><h1 className="text-3xl md:text-4xl font-bold tracking-tight">Hosting</h1><p className="text-sm text-muted-foreground mt-3">Your existing AWS deployment system, inside the new ONEORIGIN interface.</p></div>
    {!originConfig.enabled?<section className="rounded-2xl border border-accent/30 bg-card p-4 sm:p-6 space-y-3"><h2 className="font-semibold">AWS connection awaits deployment setup</h2><p className="text-sm text-muted-foreground">This repository includes the integration. The new site's login callback and AWS origin must be configured before enabling it.</p><Button asChild variant="outline" className="max-w-full h-auto min-h-9 whitespace-normal text-center"><a href="https://d1x9cuojzyjcbw.cloudfront.net/preview" target="_blank" rel="noopener noreferrer">Open the existing live console <ExternalLink className="w-4 h-4 ml-2"/></a></Button></section>:
      <section className="rounded-2xl border border-border bg-card p-4 sm:p-6 flex flex-wrap gap-4 items-center justify-between"><div><p className="font-medium">{session?'Signed in · '+session.email:'AWS operator account'}</p><p className="text-xs text-muted-foreground mt-1">Base44 sign-in and AWS operator access are separate accounts.</p></div><Button onClick={session?()=>getOriginRuntime().auth.signOut():signIn}>{session?'Sign out of AWS':'Sign in to AWS'}</Button></section>}
    {error&&<p role="alert" className="rounded-xl border border-destructive/50 p-4 text-sm">{error}</p>}
    <section className="rounded-2xl border border-border bg-card p-4 sm:p-6 space-y-4"><h2 className="font-semibold flex gap-2 items-center"><Github className="w-4 h-4"/> Repository source</h2><div className="grid grid-cols-1 md:grid-cols-2 gap-3"><label className="min-w-0 text-sm">Repository<Input className="mt-2" value={repo} onChange={e=>setRepo(e.target.value)}/></label><label className="min-w-0 text-sm">Branch<Input className="mt-2" value={branch} onChange={e=>setBranch(e.target.value)}/></label></div><Button variant="outline" disabled={!originConfig.enabled||!session||busy} onClick={importRepository}>Import repository</Button><p className="text-xs text-muted-foreground">Current AWS allowlist supports examplessdk-lgtm/1origin only. Source remains pinned to its GitHub commit.</p>
      {source&&<div className="grid grid-cols-1 md:grid-cols-[220px_minmax(0,1fr)] gap-4"><div className="min-w-0 max-h-80 overflow-auto border border-border rounded-xl p-3">{source.files.map(f=><button key={f.path} className="block text-xs text-left py-1 break-all hover:text-accent" disabled={busy} onClick={()=>openFile(f)}>{f.path}</button>)}</div><div className="min-w-0"><p className="font-mono text-xs break-all mb-2">{path||'Choose a file'}</p><textarea aria-label="Source editor" className="w-full min-h-72 bg-background border border-border rounded-xl p-3 font-mono text-xs" value={content} onChange={e=>setContent(e.target.value)}/><Button className="mt-3" variant="outline" disabled={!path} onClick={download}><Download className="w-4 h-4 mr-2"/> Download edited file</Button><p className="text-xs text-muted-foreground mt-2">Edits stay in memory; downloading does not commit to GitHub or change a build.</p></div></div>}
    </section>
    <section className="rounded-2xl border border-border bg-card p-4 sm:p-6 space-y-4"><h2 className="font-semibold">Preview builds</h2><p className="text-sm text-muted-foreground">Builds the committed ui/nuxt app in the connected 1origin repository. It does not build this TanStack UI yet. Preview files have a seven-day lifecycle.</p><div className="flex flex-wrap gap-3"><Button disabled={!originConfig.enabled||busy||active||(!!session&&!session.operator)} onClick={start}><Play className="w-4 h-4 mr-2"/>{active?'Building…':'Create preview'}</Button><Button variant="outline" disabled={!session||busy} onClick={history}><RefreshCw className="w-4 h-4 mr-2"/>Refresh</Button></div>{builds.map(b=><article key={b.id} className="border-t border-border pt-4"><p className="font-mono text-xs break-all">{b.status} · {b.branch} · {b.commit?.slice(0,8)}</p><div className="flex flex-wrap gap-3 mt-3">{b.url&&<Button asChild variant="outline"><a href={b.url} target="_blank" rel="noopener noreferrer">Open preview <ExternalLink className="w-4 h-4 ml-2"/></a></Button>}<Button variant="outline" onClick={()=>readLogs(b.id)}>View logs</Button></div></article>)}{!builds.length&&<p className="text-sm text-muted-foreground">No preview history loaded.</p>}{logs&&<pre aria-label="Build logs" className="max-h-80 overflow-auto bg-background rounded-xl border border-border p-4 text-xs whitespace-pre-wrap break-all">{logs}</pre>}</section>
    {status&&<section className="rounded-2xl border border-border p-6"><h2 className="font-semibold">Existing console pipeline</h2><p className="text-sm text-muted-foreground mt-2">{status.project} · {status.builds?.[0]?.status||'No recent build'}</p></section>}
  </div>;
}
