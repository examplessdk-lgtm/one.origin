import {test} from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {createOriginAuth} from '../src/lib/origin/auth.js';
import {createOriginClient} from '../src/lib/origin/client.js';
const memory=()=>{const values=new Map();return{getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)}};
function authSetup(fetcher=async()=>{throw Error('unexpected network')}){
 const storage=memory(),urls=[];
 const auth=createOriginAuth({enabled:true,storage,location:{origin:'https://one.example',assign:url=>urls.push(url)},cryptoApi:webcrypto,fetcher,clientId:'public-client',domain:'https://auth.example'});
 return{auth,storage,urls};
}
test('disabled deployment never starts OAuth or AWS requests',async()=>{
 let calls=0;
 const c=createOriginClient({enabled:false,baseUrl:'https://api.example',fetcher:async()=>{calls++}});
 await assert.rejects(c.status(),/not enabled/);
 assert.equal(calls,0);
});
test('OAuth uses PKCE and canonical same-origin callback without tokens in URL',async()=>{
 const {auth,urls}=authSetup();await auth.signIn('//evil.example');
 const url=new URL(urls[0]);
 assert.equal(url.searchParams.get('redirect_uri'),'https://one.example/hosting/callback');
 assert.equal(url.searchParams.get('code_challenge_method'),'S256');
 assert.ok(url.searchParams.get('code_challenge').length>30);
 assert.ok(!url.searchParams.has('access_token'));
});
test('state mismatch fails before token exchange',async()=>{
 let calls=0;const {auth}=authSetup(async()=>{calls++;return Response.json({})});await auth.signIn('/hosting');
 await assert.rejects(auth.complete('?code=diagnostic&state=wrong'),/verification/);
 assert.equal(calls,0);
});
test('successful callback stores session and honours a safe return path',async()=>{
 const payload=o=>'header.'+Buffer.from(JSON.stringify(o)).toString('base64url')+'.fixture';
 const {auth,urls}=authSetup(async(url,options)=>{
  assert.equal(url,'https://auth.example/oauth2/token');
  assert.equal(options.body.get('redirect_uri'),'https://one.example/hosting/callback');
  assert.ok(options.body.get('code_verifier').length>40);
  return Response.json({access_token:payload({'cognito:groups':['origin-operators']}),id_token:payload({email:'operator@example.test'}),expires_in:900});
 });
 await auth.signIn('//evil.example');const state=new URL(urls[0]).searchParams.get('state');
 const result=await auth.complete('?code=diagnostic&state='+state);
 assert.equal(result.returnTo,'/hosting');assert.equal(result.session.operator,true);
 assert.equal(auth.getSession().email,'operator@example.test');
});
test('missing callback parameters cannot produce a signed-in session',async()=>{
 const {auth}=authSetup();await assert.rejects(auth.complete('?code=diagnostic'),/code and state/);assert.equal(auth.getSession(),null);
});
test('private API request carries bearer only in header and encodes file paths',async()=>{
 let seen;
 const client=createOriginClient({enabled:true,baseUrl:'https://api.example',getToken:()=> 'fixture-token',fetcher:async(url,options)=>{seen={url,options};return Response.json({content:'code'})}});
 await client.readFile('examplessdk-lgtm/1origin','a'.repeat(40),'src/a b.jsx');
 assert.equal(new URL(seen.url).searchParams.get('path'),'src/a b.jsx');assert.equal(seen.options.headers.Authorization,'Bearer fixture-token');assert.ok(!seen.url.includes('fixture-token'));
});
test('paid build request is not retried after an ambiguous network failure',async()=>{
 let calls=0;
 const c=createOriginClient({enabled:true,baseUrl:'https://api.example',getToken:()=> 'fixture-token',fetcher:async()=>{calls++;throw Error('offline')}});
 await assert.rejects(c.startPreview('11111111-2222-4333-8444-555555555555','main'),/offline/);assert.equal(calls,1);
});
