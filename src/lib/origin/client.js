// No AWS keys or GitHub installation credentials belong in this browser module.
export function createOriginClient({enabled=false,baseUrl,getToken=()=>'',fetcher=fetch}) {
  const root=String(baseUrl||'').replace(/\/$/,'');
  async function request(path,{body,protectedRoute=true}={}) {
    if(!enabled)throw new Error('AWS connection is not enabled for this deployment.');
    const token=protectedRoute?getToken():'';
    if(protectedRoute&&!token)throw new Error('Sign in with your AWS operator account.');
    const response=await fetcher(root+path,{method:body?'POST':'GET',credentials:'omit',cache:'no-store',signal:AbortSignal.timeout(35000),
      headers:{Accept:'application/json',...(token?{Authorization:'Bearer '+token}:{}),...(body?{'Content-Type':'application/json'}:{})},
      ...(body?{body:JSON.stringify(body)}:{})});
    const data=await response.json();
    if(!response.ok)throw new Error(data.error||'AWS request failed (HTTP '+response.status+').');
    return data;
  }
  return{
    status:()=>request('/status',{protectedRoute:false}),
    importRepository:(repository,ref='')=>request('/github/import?'+new URLSearchParams({repository,...(ref?{ref}:{})})),
    readFile:(repository,commit,path)=>request('/github/file?'+new URLSearchParams({repository,commit,path})),
    previews:()=>request('/previews'),
    startPreview:(requestId,branch)=>request('/previews',{body:{requestId,branch,repository:'examplessdk-lgtm/1origin'}}),
    previewLogs:id=>request('/previews/logs?'+new URLSearchParams({id})),
    consoleLogs:id=>request('/logs?'+new URLSearchParams({id})),
  };
}
