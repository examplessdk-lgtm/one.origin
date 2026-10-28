// Cognito operator authentication is separate from Base44 app-user authentication.
const SESSION='oneorigin.aws.session.v1', PKCE='oneorigin.aws.pkce.v1';
const safeReturn=path=>typeof path==='string'&&path.startsWith('/')&&!path.startsWith('//')&&!path.includes('\\')&&![...path].some(c=>c.charCodeAt(0)<32)?path:'/hosting';
function claims(jwt){try{const body=jwt.split('.')[1];return JSON.parse(atob(body.replace(/-/g,'+').replace(/_/g,'/')))}catch{return{}}}
export function createOriginAuth({enabled=false,storage,location,cryptoApi,fetcher=fetch,clientId,domain,now=Date.now}){
  const redirectUri=location.origin+'/hosting/callback';
  const base=String(domain||'').replace(/\/$/,'');
  const encode=bytes=>btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  function getSession(){
    try{
      const session=JSON.parse(storage.getItem(SESSION)||'null');
      if(!session||typeof session.accessToken!=='string'||!Number.isFinite(session.expiresAt)||session.expiresAt<=now()+5000){storage.removeItem(SESSION);return null}
      return session;
    }catch{storage.removeItem(SESSION);return null}
  }
  async function signIn(returnTo='/hosting'){
    if(!enabled)throw new Error('AWS connection is not enabled for this deployment.');
    const verifier=encode(cryptoApi.getRandomValues(new Uint8Array(48)));
    const state=encode(cryptoApi.getRandomValues(new Uint8Array(24)));
    const challenge=encode(await cryptoApi.subtle.digest('SHA-256',new TextEncoder().encode(verifier)));
    storage.setItem(PKCE,JSON.stringify({verifier,state,created:now(),returnTo:safeReturn(returnTo)}));
    const query=new URLSearchParams({response_type:'code',client_id:clientId,redirect_uri:redirectUri,scope:'openid email',state,code_challenge:challenge,code_challenge_method:'S256'});
    location.assign(base+'/oauth2/authorize?'+query);
  }
  async function complete(search){
    if(!enabled)throw new Error('AWS connection is not enabled for this deployment.');
    const query=new URLSearchParams(search);
    if(query.has('error'))throw new Error('Cognito did not complete sign-in. Start a fresh sign-in.');
    if(query.getAll('code').length!==1||query.getAll('state').length!==1||!query.get('code')||!query.get('state'))throw new Error('Missing authorization code and state. Start sign-in from Hosting.');
    let record;try{record=JSON.parse(storage.getItem(PKCE)||'null')}catch{record=null}
    if(!record?.verifier||record.state!==query.get('state')||!record.created||now()-record.created>600000||record.created>now()+60000)throw new Error('Login verification expired or does not match. Start sign-in again in this tab.');
    storage.removeItem(PKCE);
    const body=new URLSearchParams({grant_type:'authorization_code',client_id:clientId,redirect_uri:redirectUri,code:query.get('code'),code_verifier:record.verifier});
    const response=await fetcher(base+'/oauth2/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body,signal:AbortSignal.timeout(20000)});
    const data=await response.json();
    if(!response.ok||!data.access_token||!data.id_token)throw new Error('Cognito token exchange failed. Start a fresh sign-in.');
    const user=claims(data.id_token),access=claims(data.access_token);
    const session={accessToken:data.access_token,expiresAt:now()+Math.max(1,Number(data.expires_in)||900)*1000,email:typeof user.email==='string'?user.email:'AWS operator',operator:Array.isArray(access['cognito:groups'])&&access['cognito:groups'].includes('origin-operators')};
    storage.setItem(SESSION,JSON.stringify(session));
    return{session,returnTo:safeReturn(record.returnTo)};
  }
  function signOut(){storage.removeItem(SESSION);storage.removeItem(PKCE);location.assign(base+'/logout?'+new URLSearchParams({client_id:clientId,logout_uri:location.origin+'/hosting'}))}
  return{getSession,signIn,complete,signOut};
}
