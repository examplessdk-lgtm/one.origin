/* eslint-disable @typescript-eslint/no-require-imports -- Node test runner uses CommonJS. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHandler } = require('./preview.cjs');
const SHA = 'a'.repeat(40);
const ID = '11111111-2222-4333-8444-555555555555';
const claims = { sub: 'bank', token_use: 'access', 'cognito:groups': ['origin-operators'] };
const event = (method, path, body, user = claims) => ({ rawPath:path, body:JSON.stringify(body), requestContext:{http:{method},authorizer:{jwt:{claims:user}}} });
const startEvent = () => event('POST','/previews',{ requestId:ID, branch:'main' });
function setup(overrides = {}) {
  const calls = [];
  const aws = async (service, operation, input) => {
    calls.push({service,operation,input});
    if (operation === 'Invoke') return { Payload:Buffer.from(JSON.stringify({statusCode:200,body:JSON.stringify({ repository:{fullName:'examplessdk-lgtm/1origin',commitSha:SHA,private:false} })})) };
    if (operation === 'StartBuild') return {build:{id:'preview:'+ID,buildStatus:'IN_PROGRESS',environment:{environmentVariables:input.environmentVariablesOverride}}};
    throw new Error('unexpected AWS operation');
  };
  return {calls,handler:createHandler({aws,project:'preview',broker:'broker',bucket:'preview-bucket',domain:'preview.example.com',...overrides})};
}
test('anonymous and nonoperators cannot start paid builds', async () => {
  const {handler,calls}=setup();
  assert.equal((await handler(event('POST','/previews',{},{}))).statusCode,401);
  assert.equal((await handler(event('POST','/previews',{}, {...claims,'cognito:groups':[]}))).statusCode,403);
  assert.equal(calls.length,0);
});
test('rejects shell syntax and unknown repository before AWS calls',async()=>{
  const {handler,calls}=setup();
  assert.equal((await handler(event('POST','/previews',{requestId:ID,branch:'$(env)'}))).statusCode,400);
  assert.equal((await handler(event('POST','/previews',{requestId:ID,repository:'evil/repo'}))).statusCode,400);
  assert.equal(calls.length,0);
});
test('resolves GitHub App commit and starts a pinned idempotent isolated preview',async()=>{
  const {handler,calls}=setup();
  const response=await handler(startEvent());
  assert.equal(response.statusCode,202);
  const input=calls.find(c=>c.operation==='StartBuild').input;
  assert.equal(input.projectName,'preview');
  assert.equal(input.idempotencyToken.length,64);
  assert.equal(input.environmentVariablesOverride.find(v=>v.name==='COMMIT_SHA').value,SHA);
  assert.equal(input.artifactsOverride.name,ID);
  const data=JSON.parse(response.body);
  assert.equal(data.build.commit,SHA);
  assert.equal(data.build.url,null);
  assert.ok(!response.body.includes('OWNER_HASH'));
});
test('private source cannot fall back to credentialed build execution',async()=>{
  const {handler}=setup({aws:async()=>({Payload:Buffer.from(JSON.stringify({statusCode:200,body:JSON.stringify({repository:{fullName:'examplessdk-lgtm/1origin',commitSha:SHA,private:true}})}))})});
  assert.equal((await handler(startEvent())).statusCode,422);
});
test('foreign build logs are denied before CloudWatch reads',async()=>{
  let reads=0;
  const {handler}=setup({aws:async(s,op)=>{ if(op==='BatchGetBuilds')return {builds:[{id:'preview:'+ID,environment:{environmentVariables:[{name:'OWNER_HASH',value:'another-user'}]}}]}; reads++; throw Error('must not read'); }});
  const e=event('GET','/previews/logs'); e.queryStringParameters={id:ID};
  assert.equal((await handler(e)).statusCode,404);
  assert.equal(reads,0);
});
test('upstream failure returns sanitized response without retrying StartBuild',async()=>{
  const {handler}=setup({aws:async()=>{throw Error('secret-value');}});
  const response=await handler(startEvent());
  assert.equal(response.statusCode,503);
  assert.ok(!response.body.includes('secret-value'));
});
test('history hides other owners and exposes preview only for successful builds',async()=>{
  const owner=require('node:crypto').createHash('sha256').update('bank').digest('hex');
  const env=[{name:'OWNER_HASH',value:owner},{name:'COMMIT_SHA',value:SHA},{name:'PREVIEW_ID',value:ID}];
  const {handler}=setup({aws:async(s,op)=>op==='ListBuildsForProject'?{ids:['preview:'+ID,'preview:foreign']}:{builds:[
    {id:'preview:'+ID,buildStatus:'SUCCEEDED',environment:{environmentVariables:env},phases:[{phaseType:'COMPLETED'}]},
    {id:'preview:foreign',buildStatus:'SUCCEEDED',environment:{environmentVariables:[]}}
  ]}});
  const response=await handler(event('GET','/previews'));
  const data=JSON.parse(response.body);
  assert.equal(data.builds.length,1);
  assert.equal(data.builds[0].phases[0].status,'SUCCEEDED');
  assert.equal(data.builds[0].url,'https://preview.example.com/previews/11111111-2222-4333-8444-555555555555/');
});
test('owned logs redact recognized credentials and use actual build log stream',async()=>{
  const owner=require('node:crypto').createHash('sha256').update('bank').digest('hex');
  const {handler}=setup({aws:async(s,op,input)=>{
    if(op==='BatchGetBuilds')return{builds:[{id:'preview:'+ID,environment:{environmentVariables:[{name:'OWNER_HASH',value:owner}]},logs:{groupName:'build-log',streamName:'one'}}]};
    assert.equal(input.logGroupName,'build-log');
    assert.equal(input.logStreamName,'one');
    return{events:[{timestamp:1,message:'Bearer forbidden-token ghp_forbidden'}]};
  }});
  const e=event('GET','/previews/logs');e.queryStringParameters={id:ID};
  const response=await handler(e);
  assert.equal(response.statusCode,200);
  assert.ok(!response.body.includes('forbidden'));
});
