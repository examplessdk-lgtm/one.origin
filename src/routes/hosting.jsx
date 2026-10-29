import {createFileRoute} from '@tanstack/react-router';
import {useEffect,useRef,useState} from 'react';
import {Button as BaseButton} from '@/components/ui/button';
import {Input as BaseInput} from '@/components/ui/input';
import {getOriginRuntime,originConfig} from '@/lib/origin/runtime';
import {Github,Play,RefreshCw,ExternalLink,ArrowRight,CheckCircle2,FolderGit2,Rocket,LogIn} from 'lucide-react';
export const Route=createFileRoute('/hosting')({ssr:false,validateSearch:search=>({template:search.template==='origin-starter'?'origin-starter':undefined}),head:()=>({meta:[{title:'Projects & Production — ONEORIGIN'}]}),component:Hosting});
// Keep the copied Base44 components; this scope applies the original page's
// 48px controls and neutral surfaces instead of the kit's 36px defaults.
function Button({className='',variant='default',...props}){
 return <BaseButton {...props} variant={variant} data-variant={variant} className={'origin-workspace__control origin-workspace__button '+className}/>;
}
function Input({className='',...props}){
 return <BaseInput {...props} className={'origin-workspace__control origin-workspace__field '+className}/>;
}
const card='origin-workspace__card min-w-0 rounded-2xl p-4 sm:p-6';
function Hosting(){
 const {template}=Route.useSearch();
 const starter=template==='origin-starter', repository=starter?'examplessdk-lgtm/OriginStarter-Template':'examplessdk-lgtm/1origin';
 const [session,setSession]=useState(null),[phase,setPhase]=useState(1),[projects,setProjects]=useState([]),[selected,setSelected]=useState('');
 const [name,setName]=useState(''),[branch,setBranch]=useState('main');
 const [builds,setBuilds]=useState([]),[releases,setReleases]=useState([]),[logs,setLogs]=useState(''),[message,setMessage]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[loading,setLoading]=useState(false);
 const locked=useRef(false),createId=useRef(null),buildId=useRef(null),releaseId=useRef(null);
 const project=projects.find(p=>p.id===selected), canOperate=!!session?.operator;
 function fail(e){setError(e.message||'Request failed.');}
 async function reloadProjects(){const data=await getOriginRuntime().client.projects();setProjects(data.items||[]);setSelected(id=>id||(data.items?.[0]?.id||''));}
 async function reloadProject(id){const client=getOriginRuntime().client;const [b,r]=await Promise.all([client.projectBuilds(id),client.releases(id)]);setBuilds(b.builds||[]);setReleases(r.items||[]);}
 useEffect(()=>{
  if(!originConfig.enabled)return;
  const auth=getOriginRuntime().auth;setSession(auth.getSession());
  const timer=setInterval(()=>setSession(auth.getSession()),10000);return()=>clearInterval(timer);
 },[]);
 useEffect(()=>{
  if(!session?.operator){setProjects([]);setSelected('');return;}
  setLoading(true);void reloadProjects().catch(fail).finally(()=>setLoading(false));
 },[session?.accessToken,session?.operator]);
 useEffect(()=>{
  setBuilds([]);setReleases([]);setLogs('');
  if(!selected||!session?.operator)return;
  let active=true;
  const load=async()=>{try{const c=getOriginRuntime().client;const [b,r]=await Promise.all([c.projectBuilds(selected),c.releases(selected)]);if(active){setBuilds(b.builds||[]);setReleases(r.items||[])}}catch(e){if(active)fail(e)}};
  void load();const timer=setInterval(load,10000);return()=>{active=false;clearInterval(timer)};
 },[selected,session?.accessToken,session?.operator]);
 async function action(fn){if(locked.current)return;locked.current=true;setBusy(true);setError('');setMessage('');try{await fn()}catch(e){fail(e)}finally{locked.current=false;setBusy(false)}}
 function signIn(){void action(()=>getOriginRuntime().auth.signIn(starter?'/hosting?template=origin-starter':'/hosting'));}
 function create(){void action(async()=>{
  createId.current||=crypto.randomUUID();
  const result=await getOriginRuntime().client.createProject({requestId:createId.current,name:name.trim(),repository,branch:starter?'main':branch.trim()||'main'});
  createId.current=null;await reloadProjects();setSelected(result.project.id);setPhase(2);setName('');setMessage('Project created and GitHub connection verified.');
 });}
 function start(){if(!project)return;void action(async()=>{
  buildId.current||=crypto.randomUUID();await getOriginRuntime().client.startProjectBuild(project.id,buildId.current);buildId.current=null;
  setMessage('Build accepted. Status and logs update here; this does not replace Production.');await reloadProject(project.id);
 });}
 function publish(build){if(!project||!window.confirm('Publish this successful build as a public production release? It will remain available after the preview expires. AWS storage and transfer charges apply.'))return;
  void action(async()=>{
   if(releaseId.current?.buildId!==build.id)releaseId.current={buildId:build.id,id:crypto.randomUUID()};
   const result=await getOriginRuntime().client.publish(project.id,build.id,releaseId.current.id);
   if(result.release.status==='READY'){releaseId.current=null;setMessage('Production release is live.');}else setMessage('Release is publishing. Refresh status before trying another request.');
   await Promise.all([reloadProjects(),reloadProject(project.id)]);
  });
 }
 function refresh(){void action(async()=>{await reloadProjects();if(selected)await reloadProject(selected)});}
 function readLogs(id){void action(async()=>{const result=await getOriginRuntime().client.previewLogs(id);setLogs(result.events.map(e=>e.message).join('')||'No logs yet. Refresh while the build is running.');});}
 const activeBuild=builds.some(b=>b.status==='IN_PROGRESS');
 return <div className="origin-workspace w-full min-w-0 max-w-6xl mx-auto px-4 sm:px-6 py-10 md:py-16 space-y-6 [overflow-wrap:anywhere]">
  <div className="flex flex-wrap gap-4 items-start justify-between"><div><p className="text-[10px] tracking-[0.3em] text-muted-foreground mb-3">YOUR CODE. YOUR PRODUCTION.</p><h1 className="text-3xl md:text-4xl font-bold tracking-tight">Projects & Production</h1><p className="text-sm text-muted-foreground mt-3">Create your project. Build your source. Publish a real production release.</p></div>{session&&<Button variant="outline" onClick={()=>getOriginRuntime().auth.signOut()}>Sign out</Button>}</div>
  {starter&&<section className={card+' space-y-4'}><h2 className="font-semibold">Deploy Origin Starter on Cloudflare</h2><p className="text-sm text-muted-foreground">Available to everyone. Sign in to your own Cloudflare account to create and deploy this starter. Cloudflare account limits and billing apply.</p><p className="text-xs text-muted-foreground">Locked source: examplessdk-lgtm/OriginStarter-Template · main</p><Button asChild><a href="https://deploy.workers.cloudflare.com/?url=https%3A%2F%2Fgithub.com%2Fexamplessdk-lgtm%2FOriginStarter-Template" target="_blank" rel="noopener noreferrer"><Rocket className="size-4"/>Deploy to Cloudflare<ExternalLink className="size-4"/></a></Button><p className="text-xs text-muted-foreground">The AWS workspace below currently requires operator access.</p></section>}
  <div className="grid grid-cols-2 gap-3" aria-label="Deployment phases">{[[1,'Create project',FolderGit2],[2,'Production',Rocket]].map(([n,label,Icon])=><button key={n} onClick={()=>setPhase(n)} aria-pressed={phase===n} className="origin-workspace__phase min-w-0 flex items-center justify-center gap-2 px-3 text-center text-sm"><Icon className="size-4 shrink-0"/><span>{n}. {label}</span></button>)}</div>
  {!originConfig.enabled?<section className={card}><h2 className="font-semibold">Operations are available on the production domain</h2><p className="text-sm text-muted-foreground mt-2">Open os.1origin.dev to connect to the existing AWS backend. This environment has operations disabled.</p></section>:!session?<section className={card+' space-y-4'}><h2 className="font-semibold">Sign in to your workspace</h2><p className="text-sm text-muted-foreground">Use your existing ONEORIGIN operator account. You return here after secure sign-in; projects, builds and logs stay in this interface.</p><Button disabled={busy} onClick={signIn}><LogIn className="size-4"/>Sign in</Button></section>:!canOperate?<section className={card}><h2 className="font-semibold">Operator access required</h2><p className="text-sm text-muted-foreground mt-2">Your account is signed in but cannot start builds or publish releases. Ask your workspace administrator for access.</p></section>:<div className="flex flex-wrap gap-3 items-center justify-between text-sm"><span className="text-muted-foreground flex items-center gap-2"><CheckCircle2 className="size-4"/>{session.email}</span><Button disabled={busy||loading} variant="outline" onClick={refresh}><RefreshCw className="size-4"/>Refresh</Button></div>}
  {error&&<p role="alert" className="rounded-xl border border-destructive p-4 text-sm">{error} If a write request timed out, refresh status before submitting again.</p>}
  {message&&<p role="status" className="rounded-xl border border-border bg-secondary p-4 text-sm">{message}</p>}
  {phase===1?<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
   <section className={card+' space-y-4'}><h2 className="font-semibold flex items-center gap-2"><Github className="size-4"/>{starter?'Deploy Origin Starter':'Create project'}</h2><p className="text-sm text-muted-foreground">Saved in your AWS workspace after GitHub verifies the repository and branch.</p><label className="block text-sm">Project name<Input className="mt-2" value={name} maxLength={80} onChange={e=>{setName(e.target.value);createId.current=null}} placeholder="My project"/></label><label className="block text-sm">Repository<Input className="mt-2" value={repository} readOnly aria-label="Locked repository"/></label><label className="block text-sm">Branch<Input className="mt-2" value={starter?'main':branch} readOnly={starter} maxLength={128} onChange={e=>{setBranch(e.target.value);createId.current=null}}/></label><p className="text-xs text-muted-foreground">{starter?'Origin Starter Template · main · locked starting template.':'Connected source: ui/nuxt · static build.'}</p><Button disabled={!canOperate||busy||!name.trim()} onClick={create}>Create project<ArrowRight className="size-4"/></Button></section>
   <section className={card+' space-y-4'}><h2 className="font-semibold">Your projects</h2>{loading?<p role="status" className="text-sm text-muted-foreground">Loading projects…</p>:!projects.length?<p className="text-sm text-muted-foreground">No projects loaded. Sign in and create your first project.</p>:projects.map(p=><button key={p.id} onClick={()=>{setSelected(p.id);setPhase(2)}} className="origin-workspace__project w-full min-w-0 text-left rounded-xl p-4"><span className="block font-medium">{p.name}</span><span className="block text-xs text-muted-foreground mt-2">{p.repository} · {p.branch}</span><span className="block text-xs mt-2">{p.production?'Production live':'Ready to build'} →</span></button>)}</section>
  </div>:<>
   <section className={card+' space-y-4'}><h2 className="font-semibold">Production workspace</h2><label className="block text-sm">Project<select aria-label="Select project" className="origin-workspace__control origin-workspace__field block mt-2 w-full min-w-0" value={selected} onChange={e=>setSelected(e.target.value)}><option value="">Choose a project</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>{project?<><p className="text-xs text-muted-foreground">{project.repository} · {project.branch}</p>{project.production&&<a href={project.production.url} target="_blank" rel="noopener noreferrer" className="block break-all text-sm underline">Open current production ↗</a>}<Button disabled={!canOperate||busy||activeBuild} onClick={start}><Play className="size-4"/>{activeBuild?'Building…':'Build project'}</Button><p className="text-xs text-muted-foreground">Build uses an immutable GitHub commit. Review the result, then choose Publish production. Previews expire after seven days; production releases do not.</p></>:<p className="text-sm text-muted-foreground">Create a project in phase 1 to begin.</p>}</section>
   <section className={card+' space-y-4'}><h2 className="font-semibold">Builds & logs</h2>{!builds.length&&<p className="text-sm text-muted-foreground">No builds loaded for this project.</p>}{builds.map(b=><article key={b.id} className="border-t border-border pt-4 space-y-3"><p className="font-mono text-xs">{b.status} · {b.branch} · {b.commit?.slice(0,8)}</p><div className="flex flex-wrap gap-2"><Button variant="outline" disabled={busy} onClick={()=>readLogs(b.id)}>View logs</Button>{b.url&&<><Button asChild variant="outline"><a href={b.url} target="_blank" rel="noopener noreferrer">Review build<ExternalLink className="size-4"/></a></Button><Button disabled={busy||!canOperate} onClick={()=>publish(b)}><Rocket className="size-4"/>Publish production</Button></>}</div></article>)}{logs&&<pre aria-label="Build logs" className="min-w-0 max-h-96 overflow-auto whitespace-pre-wrap break-all rounded-xl border border-border bg-background p-4 text-xs">{logs}</pre>}</section>
   <section className={card+' space-y-4'}><h2 className="font-semibold">Production releases</h2>{!releases.length&&<p className="text-sm text-muted-foreground">No production releases yet. Successful releases remain available independently of previews.</p>}{releases.map(r=><article key={r.id} className="border-t border-border pt-4 space-y-2"><p className="font-mono text-xs">{r.status} · {r.commit?.slice(0,8)}</p>{r.url&&<a className="block break-all text-sm underline" href={r.url} target="_blank" rel="noopener noreferrer">{r.url} ↗</a>}</article>)}</section>
  </>}
 </div>;
}
