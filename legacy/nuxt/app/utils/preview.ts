export type PreviewBuild = {
  id:string, status:string, commit?:string, branch?:string, repository:string,
  createdAt?:string, url:string|null, phases:{name:string,status:string}[]
}
export function createPreviewClient(token:()=>string, fetcher:typeof fetch=fetch) {
  async function request(path:string, body?:Record<string,string>) {
    const accessToken=token()
    if (!accessToken) throw new Error('Sign in to use previews.')
    const response=await fetcher('https://7a158myew1.execute-api.ap-southeast-1.amazonaws.com'+path,{
      method:body?'POST':'GET',credentials:'omit',cache:'no-store',signal:AbortSignal.timeout(35000),
      headers:{Authorization:'Bearer '+accessToken,Accept:'application/json',...(body?{'Content-Type':'application/json'}:{})},
      ...(body?{body:JSON.stringify(body)}:{})
    })
    const data=await response.json()
    if (!response.ok) throw new Error(data.error || 'Preview request failed (HTTP '+response.status+').')
    return data
  }
  return {
    start:(requestId:string,branch:string)=>request('/previews',{requestId,branch,repository:'examplessdk-lgtm/1origin'}) as Promise<{build:PreviewBuild}>,
    history:()=>request('/previews') as Promise<{builds:PreviewBuild[]}>,
    logs:(id:string)=>request('/previews/logs?id='+encodeURIComponent(id)) as Promise<{events:{timestamp:number,message:string}[]}>
  }
}
