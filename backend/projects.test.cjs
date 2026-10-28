const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const {createHandler}=require('./preview.cjs');
const PROJECT='11111111-2222-4333-8444-555555555555',BUILD='22222222-2222-4333-8444-555555555555',RELEASE='33333333-2222-4333-8444-555555555555',SHA='a'.repeat(40);
const claims={sub:'bank',token_use:'access','cognito:groups':['origin-operators']};
const owner=createHash('sha256').update('bank').digest('hex');
const event=(method,path,body,user=claims)=>({rawPath:path,body:JSON.stringify(body),requestContext:{http:{method},authorizer:{jwt:{claims:user}}}});
function setup(){
 const db=new Map(),calls=[],objects=new Map();
 let status='SUCCEEDED',buildOwner=owner,buildProject=PROJECT,failCopy=false,expired=false;
 const entry={id:PROJECT,name:'ONEORIGIN',branch:'main',repository:'examplessdk-lgtm/1origin'};
 const key=i=>i.pk.S+'|'+i.sk.S;
 db.set(owner+'|PROJECT#'+PROJECT,{pk:{S:owner},sk:{S:'PROJECT#'+PROJECT},data:{S:JSON.stringify(entry)}});
 const aws=async(service,op,i)=>{
  calls.push({service,op,i});
  if(op==='GetItem')return {Item:db.get(key(i.Key))};
  if(op==='PutItem'){if(i.ConditionExpression&&db.has(key(i.Item)))throw Object.assign(Error(),{name:'ConditionalCheckFailedException'});db.set(key(i.Item),i.Item);return{};}
  if(op==='Query')return{Items:[...db.values()].filter(x=>x.pk.S===i.ExpressionAttributeValues[':pk'].S&&x.sk.S.startsWith(i.ExpressionAttributeValues[':prefix'].S))};
  if(op==='Invoke')return{Payload:Buffer.from(JSON.stringify({statusCode:200,body:JSON.stringify({repository:{fullName:'examplessdk-lgtm/1origin',commitSha:SHA,private:false}})}))};
  if(op==='BatchGetBuilds')return{builds:[{id:'build:'+BUILD,buildStatus:status,environment:{environmentVariables:Object.entries({OWNER_HASH:buildOwner,APP_PROJECT_ID:buildProject,PREVIEW_ID:BUILD,COMMIT_SHA:SHA}).map(([name,value])=>({name,value}))}}]};
  if(op==='StartBuild')return{build:{id:'build:'+BUILD,environment:{environmentVariables:i.environmentVariablesOverride},buildStatus:'IN_PROGRESS'}};
  if(op==='ListBuildsForProject')return{ids:['build:'+BUILD]};
  if(op==='ListObjectsV2')return{Contents:expired?[]:[{Key:'previews/'+BUILD+'/index.html',Size:100},{Key:'previews/'+BUILD+'/_nuxt/app.js',Size:50},{Key:'previews/'+BUILD+'/favicon.png',Size:25}]};
  if(op==='GetObject')return{Body:Buffer.from('<script src="/previews/'+BUILD+'/_nuxt/app.js"></script>'),ContentType:i.Key.endsWith('.js')?'application/javascript':'text/html'};
  if(op==='PutObject'||op==='CopyObject'){if(failCopy)throw Error('private AWS message');objects.set(i.Key,i.Body);return{};}
  if(op==='TransactWriteItems'){for(const x of i.TransactItems)db.set(key(x.Put.Item),x.Put.Item);return{};}
  throw Error('Unexpected '+op);
 };
 return {db,calls,objects,handler:createHandler({aws,project:'build',broker:'broker',bucket:'bucket',domain:'cdn.example.com',table:'projects'}),set:x=>{if(x.status)status=x.status;if(x.buildOwner)buildOwner=x.buildOwner;if(x.buildProject)buildProject=x.buildProject;if(x.failCopy)failCopy=true;if(x.expired)expired=true;}};
}
const production=(body={requestId:RELEASE,buildId:BUILD},user=claims)=>event('POST','/projects/'+PROJECT+'/production',body,user);

test('projects require operator access and isolate rows by subject',async()=>{
 const s=setup();assert.equal((await s.handler(event('GET','/projects',null,{}))).statusCode,401);
 assert.equal((await s.handler(event('GET','/projects',null,{...claims,'cognito:groups':[]}))).statusCode,403);
 const foreign=await s.handler(event('GET','/projects',null,{...claims,sub:'foreign'}));assert.equal(JSON.parse(foreign.body).items.length,0);
 assert.equal((await s.handler(production(undefined,{...claims,sub:'foreign'}))).statusCode,404);
 assert.ok(!s.calls.some(c=>c.op==='PutObject'));
});
test('project creation verifies source, persists and reuses idempotent request',async()=>{
 const s=setup(),body={requestId:RELEASE,name:'My real project',repository:'examplessdk-lgtm/1origin',branch:'main'};
 const first=await s.handler(event('POST','/projects',body));assert.equal(first.statusCode,201);assert.equal(JSON.parse(first.body).project.commit,SHA);
 assert.equal((await s.handler(event('POST','/projects',body))).statusCode,200);assert.equal(s.calls.filter(c=>c.op==='Invoke').length,1);
});
test('arbitrary repositories, missing names and shell branches cannot create projects',async()=>{
 for(const data of [{repository:'evil/repo',name:'app'},{repository:'examplessdk-lgtm/1origin',name:''},{repository:'examplessdk-lgtm/1origin',name:'app',branch:'$(env)'}]){
  const s=setup();assert.equal((await s.handler(event('POST','/projects',{requestId:RELEASE,...data}))).statusCode,400);assert.equal(s.calls.filter(c=>c.op==='Invoke').length,0);
 }
});
test('project preview pins server project branch and adds project ownership to build',async()=>{
 const s=setup();const r=await s.handler(event('POST','/projects/'+PROJECT+'/previews',{requestId:BUILD,branch:'evil'}));assert.equal(r.statusCode,202);
 const env=Object.fromEntries(s.calls.find(c=>c.op==='StartBuild').i.environmentVariablesOverride.map(v=>[v.name,v.value]));assert.equal(env.APP_PROJECT_ID,PROJECT);assert.equal(env.SOURCE_BRANCH,'main');assert.equal(env.COMMIT_SHA,SHA);
});
test('only successful owned project builds can publish',async()=>{
 for(const [settings,code] of [[{status:'FAILED'},409],[{buildOwner:'foreign'},404],[{buildProject:RELEASE},409]]){
  const s=setup();s.set(settings);assert.equal((await s.handler(production())).statusCode,code);assert.equal(s.objects.size,0);
 }
});
test('expired preview artifacts fail before creating a release',async()=>{
 const s=setup();s.set({expired:true});assert.equal((await s.handler(production())).statusCode,409);assert.equal(s.objects.size,0);
});
test('production rewrites HTML and JS base paths, copies binaries, and records durable URL atomically',async()=>{
 const s=setup();const r=await s.handler(production());assert.equal(r.statusCode,201);const release=JSON.parse(r.body).release;assert.equal(release.status,'READY');assert.match(release.url,/\/production\//);
 for(const [path,body] of s.objects)if(body){assert.match(body.toString(),new RegExp('/production/'+PROJECT+'/'+RELEASE+'/'));assert.ok(!body.toString().includes('/previews/'));assert.ok(path.startsWith('production/'));}
 assert.ok(s.calls.some(c=>c.op==='CopyObject'));assert.ok(s.calls.some(c=>c.op==='TransactWriteItems'));
 const p=JSON.parse(s.db.get(owner+'|PROJECT#'+PROJECT).data.S);assert.equal(p.production.url,release.url);
 const before=s.calls.length;assert.equal((await s.handler(production())).statusCode,200);assert.ok(!s.calls.slice(before).some(c=>c.op==='PutObject'));
 assert.equal((await s.handler(production({requestId:RELEASE,buildId:PROJECT}))).statusCode,409);
});
test('failed copies never publish a URL and return sanitized error; release status remains pollable',async()=>{
 const s=setup();s.set({failCopy:true});const r=await s.handler(production());assert.equal(r.statusCode,503);assert.ok(!r.body.includes('private AWS'));
 const history=JSON.parse((await s.handler(event('GET','/projects/'+PROJECT+'/production'))).body);assert.equal(history.items[0].status,'FAILED');assert.equal(history.items[0].url,undefined);
 assert.equal(JSON.parse(s.db.get(owner+'|PROJECT#'+PROJECT).data.S).production,undefined);
});
