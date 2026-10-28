/* eslint-disable @typescript-eslint/no-require-imports -- AWS Lambda CommonJS runtime. */
// Single trusted operator workspace. Public allowlisted source only; no arbitrary build commands.
const { createHash } = require('node:crypto');
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const SHA = /^[a-f0-9]{40}$/;
const REPOSITORY = 'examplessdk-lgtm/1origin';
const hash = value => createHash('sha256').update(value).digest('hex');
class Problem extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
function reply(statusCode, value) {
  return {statusCode, headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'},body:JSON.stringify(value)};
}
function variables(build) {
  return Object.fromEntries((build.environment?.environmentVariables || []).map(v => [v.name,v.value]));
}
function createHandler({ aws, project, broker, bucket, domain, table }) {
  return async event => {
    try {
      const claims = event.requestContext?.authorizer?.jwt?.claims || {};
      if (!claims.sub || claims.token_use !== 'access') throw new Problem(401,'Sign in to create a preview.');
      const groups = Array.isArray(claims['cognito:groups']) ? claims['cognito:groups'] : String(claims['cognito:groups'] || '').match(/[\w-]+/g) || [];
      if (!groups.includes('origin-operators')) throw new Problem(403,'Operator membership required.');
      const owner = hash(claims.sub);
      let path = event.rawPath; const method = event.requestContext?.http?.method;
      function present(build) {
        const env = variables(build);
        const ready = build.buildStatus === 'SUCCEEDED' && UUID.test(env.PREVIEW_ID || '');
        return {id:build.id.split(':').pop(),status:build.buildStatus,commit:env.COMMIT_SHA,
          repository:REPOSITORY,branch:env.SOURCE_BRANCH,createdAt:build.startTime,
          phases:(build.phases || []).map(p=>({name:p.phaseType,status:p.phaseStatus || (p.phaseType === 'COMPLETED' ? build.buildStatus : 'IN_PROGRESS')})),
          url:ready ? `https://${domain}/previews/${env.PREVIEW_ID}/` : null};
      }
      async function ownedBuild(id) {
        if (!UUID.test(id || '')) throw new Problem(400,'Invalid build identifier.');
        const result = await aws('codebuild','BatchGetBuilds',{ids:[project+':'+id]});
        const build = result.builds?.[0];
        if (!build || variables(build).OWNER_HASH !== owner) throw new Problem(404,'Build not found.');
        return build;
      }
      const readBody = () => {
        if (event.isBase64Encoded || Buffer.byteLength(event.body || '') > 2048) throw new Problem(400,'Invalid request.');
        let data; try { data=JSON.parse(event.body || '{}'); } catch { throw new Problem(400,'Invalid JSON.'); }
        if (!data || typeof data!=='object' || Array.isArray(data)) throw new Problem(400,'Expected an object.');
        return data;
      };
      const key = sk => ({pk:{S:owner},sk:{S:sk}});
      async function getRecord(sk) {
        const r=await aws('dynamodb','GetItem',{TableName:table,Key:key(sk),ConsistentRead:true});
        return r.Item ? JSON.parse(r.Item.data.S) : null;
      }
      async function putRecord(sk,data,onlyNew=false) {
        await aws('dynamodb','PutItem',{TableName:table,Item:{...key(sk),data:{S:JSON.stringify(data)}},...(onlyNew?{ConditionExpression:'attribute_not_exists(pk)'}:{})});
      }
      async function listRecords(prefix) {
        const r=await aws('dynamodb','Query',{TableName:table,KeyConditionExpression:'pk = :pk AND begins_with(sk, :prefix)',ExpressionAttributeValues:{':pk':{S:owner},':prefix':{S:prefix}},Limit:50,ScanIndexForward:false,ConsistentRead:true});
        return {items:(r.Items||[]).map(i=>JSON.parse(i.data.S)),limited:!!r.LastEvaluatedKey};
      }
      let selectedProject;
      const nested = /^\/projects\/([a-f0-9-]{36})\/(previews|production)$/.exec(path);
      if (path==='/projects' || nested) {
        if (!table) throw new Problem(503,'Project storage is not configured.');
        if (path==='/projects' && method==='GET') return reply(200,await listRecords('PROJECT#'));
        if (path==='/projects' && method==='POST') {
          const data=readBody();
          if (!UUID.test(data.requestId||'') || data.repository!==REPOSITORY || typeof data.name!=='string' || !data.name.trim() || data.name.length>80) throw new Problem(400,'Use a project name and the connected 1origin repository.');
          const branch=data.branch||'main';
          if (typeof branch!=='string' || !/^[A-Za-z0-9_./-]{1,128}$/.test(branch) || branch.includes('..') || branch.startsWith('/')) throw new Problem(400,'Invalid branch.');
          const prior=await getRecord('PROJECT#'+data.requestId);
          if (prior) return reply(200,{project:prior});
          const resolved=await resolveSource(branch);
          const record={id:data.requestId,name:data.name.trim(),repository:REPOSITORY,branch,commit:resolved.commitSha,createdAt:new Date().toISOString()};
          try { await putRecord('PROJECT#'+record.id,record,true); }
          catch(e) { if(e.name!=='ConditionalCheckFailedException')throw e; return reply(200,{project:await getRecord('PROJECT#'+record.id)}); }
          return reply(201,{project:record});
        }
        if (nested) {
          if (!UUID.test(nested[1]))throw new Problem(404,'Project not found.');
          selectedProject=await getRecord('PROJECT#'+nested[1]);
          if (!selectedProject)throw new Problem(404,'Project not found.');
          if (nested[2]==='previews') path='/previews';
          else if (method==='GET') return reply(200,await listRecords('RELEASE#'+selectedProject.id+'#'));
          else if (method==='POST') {
            const data=readBody();
            if(!UUID.test(data.requestId||'')||!UUID.test(data.buildId||''))throw new Problem(400,'A release request and build identifier are required.');
            const releaseKey='RELEASE#'+selectedProject.id+'#'+data.requestId;
            const prior=await getRecord(releaseKey);
            if(prior){if(prior.buildId!==data.buildId)throw new Problem(409,'Release request belongs to a different build.');return reply(prior.status==='READY'?200:prior.status==='FAILED'?409:202,{release:prior});}
            const build=await ownedBuild(data.buildId), env=variables(build);
            if(build.buildStatus!=='SUCCEEDED'||env.APP_PROJECT_ID!==selectedProject.id||!UUID.test(env.PREVIEW_ID||'')||!SHA.test(env.COMMIT_SHA||''))throw new Problem(409,'Choose a successful build belonging to this project.');
            const prefix='previews/'+env.PREVIEW_ID+'/';
            const listed=await aws('s3','ListObjectsV2',{Bucket:bucket,Prefix:prefix,MaxKeys:1000});
            const files=listed.Contents||[];
            if(listed.IsTruncated||!files.some(f=>f.Key===prefix+'index.html')||files.length>1000||files.reduce((n,f)=>n+(f.Size||0),0)>100*1024*1024)throw new Problem(409,'Build artifacts are missing, expired, or exceed the production release limit. Build again first.');
            if(files.some(f=>!f.Key.startsWith(prefix)||f.Key.slice(prefix.length).split('/').some(p=>p==='..'||p==='.')||f.Key.includes('\\')))throw new Problem(409,'Invalid artifact paths.');
            const release={id:data.requestId,projectId:selectedProject.id,buildId:data.buildId,commit:env.COMMIT_SHA,status:'PUBLISHING',createdAt:new Date().toISOString()};
            try {await putRecord(releaseKey,release,true);}catch(e){if(e.name==='ConditionalCheckFailedException')return reply(202,{release:await getRecord(releaseKey)});throw e;}
            try {
              // Immutable production keys have no preview lifecycle expiry. Builders cannot write this prefix.
              const target='production/'+selectedProject.id+'/'+release.id+'/';
              for(let i=0;i<files.length;i+=8)await Promise.all(files.slice(i,i+8).map(async file=>{
                const suffix=file.Key.slice(prefix.length), destination=target+suffix;
                if(/\.(html?|js|mjs|css|json|txt|svg|xml|map)$/i.test(suffix)){
                  if(file.Size>5*1024*1024)throw new Problem(409,'A text artifact exceeds the release limit.');
                  const original=await aws('s3','GetObject',{Bucket:bucket,Key:file.Key});
                  const rewritten=Buffer.from(original.Body).toString('utf8').split('/'+prefix).join('/'+target);
                  await aws('s3','PutObject',{Bucket:bucket,Key:destination,Body:Buffer.from(rewritten),ContentType:original.ContentType||'application/octet-stream',CacheControl:/\.html?$/i.test(suffix)?'no-cache':'public, max-age=31536000, immutable'});
                }else await aws('s3','CopyObject',{Bucket:bucket,CopySource:bucket+'/'+file.Key.split('/').map(encodeURIComponent).join('/'),Key:destination,MetadataDirective:'COPY'});
              }));
              release.status='READY';release.url=`https://${domain}/${target}`;
              selectedProject.production={releaseId:release.id,url:release.url,commit:release.commit};
              await aws('dynamodb','TransactWriteItems',{TransactItems:[{Put:{TableName:table,Item:{...key(releaseKey),data:{S:JSON.stringify(release)}}}},{Put:{TableName:table,Item:{...key('PROJECT#'+selectedProject.id),data:{S:JSON.stringify(selectedProject)}},ConditionExpression:'attribute_exists(pk)'}}]});
              return reply(201,{release});
            }catch(e){release.status='FAILED';delete release.url;await putRecord(releaseKey,release);throw e;}
          }
        }
      }
      async function resolveSource(branch) {
        const resolved=await aws('lambda','Invoke',{FunctionName:broker,Payload:Buffer.from(JSON.stringify({rawPath:'/github/import',queryStringParameters:{repository:REPOSITORY,ref:branch},requestContext:{http:{method:'GET'},authorizer:{jwt:{claims}}}}))});
        if(resolved.FunctionError)throw new Problem(503,'Repository connection unavailable.');
        const response=JSON.parse(Buffer.from(resolved.Payload).toString('utf8'));
        if(response.statusCode!==200)throw new Problem(422,'Cannot resolve this branch through the connected GitHub App.');
        const source=JSON.parse(response.body).repository;
        if(source?.fullName!==REPOSITORY||!SHA.test(source.commitSha||'')||source.private!==false)throw new Problem(422,'Only the connected public repository is supported.');
        return source;
      }
      if (path === '/previews' && method === 'POST') {
        if (event.isBase64Encoded || Buffer.byteLength(event.body || '') > 2048) throw new Problem(400,'Invalid preview request.');
        let body;
        try { body = JSON.parse(event.body || '{}'); } catch { throw new Problem(400,'Invalid JSON.'); }
        if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Problem(400,'Invalid preview request.');
        if (!UUID.test(body.requestId || '') || (body.repository && body.repository !== REPOSITORY)) throw new Problem(400,'Only the connected 1origin project is supported.');
        const branch = selectedProject?.branch || body.branch || 'main';
        if (typeof branch !== 'string' || !/^[A-Za-z0-9_./-]{1,128}$/.test(branch) || branch.includes('..') || branch.startsWith('/')) throw new Problem(400,'Invalid branch.');
        const source = await resolveSource(branch);
        const env = {COMMIT_SHA:source.commitSha,SOURCE_BRANCH:branch,OWNER_HASH:owner,PREVIEW_ID:body.requestId,...(selectedProject?{APP_PROJECT_ID:selectedProject.id}:{})};
        const started = await aws('codebuild','StartBuild',{
          projectName:project,idempotencyToken:hash(owner+':'+(selectedProject?.id||'legacy')+':'+body.requestId),
          environmentVariablesOverride:Object.entries(env).map(([name,value])=>({name,value,type:'PLAINTEXT'})),
          artifactsOverride:{type:'S3',location:bucket,path:'previews',name:body.requestId,namespaceType:'NONE',packaging:'NONE',overrideArtifactName:false,encryptionDisabled:true}
        });
        return reply(202,{build:present(started.build)});
      }
      if (path === '/previews' && method === 'GET') {
        const listed = await aws('codebuild','ListBuildsForProject',{projectName:project,sortOrder:'DESCENDING'});
        const ids = (listed.ids || []).slice(0,50);
        const builds = ids.length ? (await aws('codebuild','BatchGetBuilds',{ids})).builds || [] : [];
        return reply(200,{builds:builds.filter(b=>variables(b).OWNER_HASH===owner&&(!selectedProject||variables(b).APP_PROJECT_ID===selectedProject.id)).map(present),limitedTo:50});
      }
      if (path === '/previews/logs' && method === 'GET') {
        const build = await ownedBuild(event.queryStringParameters?.id);
        const group = build.logs?.groupName, stream = build.logs?.streamName;
        if (!group || !stream) return reply(200,{events:[]});
        const logs = await aws('logs','GetLogEvents',{logGroupName:group,logStreamName:stream,startFromHead:false,limit:200});
        const events = (logs.events || []).map(e=>({timestamp:e.timestamp,message:e.message
          .replace(/(?:gh[pousr]_[A-Za-z0-9_]+|github_pat_[A-Za-z0-9_]+|AKIA[A-Z0-9]{16})/g,'[REDACTED]')
          .replace(/Bearer\s+[^\s]+/gi,'Bearer [REDACTED]')}));
        return reply(200,{events});
      }
      throw new Problem(404,'Route not found.');
    } catch (error) {
      if (error instanceof Problem) return reply(error.status,{error:error.message});
      // Do not log provider responses, source contents, credentials, or request bodies.
      return reply(503,{error:'Preview service unavailable. Refresh history before submitting another build.'});
    }
  };
}
let runtime;
exports.handler = async event => {
  if (!runtime) {
    const cb = require('@aws-sdk/client-codebuild');
    const lf = require('@aws-sdk/client-lambda');
    const cw = require('@aws-sdk/client-cloudwatch-logs');
    const db = require('@aws-sdk/client-dynamodb');
    const s3 = require('@aws-sdk/client-s3');
    const clients = {dynamodb:new db.DynamoDBClient({maxAttempts:1}),s3:new s3.S3Client({maxAttempts:1}),codebuild:new cb.CodeBuildClient({maxAttempts:1}),lambda:new lf.LambdaClient({maxAttempts:1}),logs:new cw.CloudWatchLogsClient({maxAttempts:1})};
    const commands = {...cb,...lf,...cw,...db,...s3};
    runtime = createHandler({project:process.env.PROJECT,broker:process.env.BROKER,bucket:process.env.BUCKET,domain:process.env.PREVIEW_DOMAIN,table:process.env.TABLE,
      aws:async(service,operation,input)=>{const result=await clients[service].send(new commands[operation+'Command'](input));if(service==='s3'&&operation==='GetObject')result.Body=await result.Body.transformToByteArray();return result;}});
  }
  return runtime(event);
};
exports.createHandler = createHandler;
