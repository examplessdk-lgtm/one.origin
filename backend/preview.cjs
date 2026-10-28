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
function createHandler({ aws, project, broker, bucket, domain }) {
  return async event => {
    try {
      const claims = event.requestContext?.authorizer?.jwt?.claims || {};
      if (!claims.sub || claims.token_use !== 'access') throw new Problem(401,'Sign in to create a preview.');
      const groups = Array.isArray(claims['cognito:groups']) ? claims['cognito:groups'] : String(claims['cognito:groups'] || '').match(/[\w-]+/g) || [];
      if (!groups.includes('origin-operators')) throw new Problem(403,'Operator membership required.');
      const owner = hash(claims.sub);
      const path = event.rawPath, method = event.requestContext?.http?.method;
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
      if (path === '/previews' && method === 'POST') {
        if (event.isBase64Encoded || Buffer.byteLength(event.body || '') > 2048) throw new Problem(400,'Invalid preview request.');
        let body;
        try { body = JSON.parse(event.body || '{}'); } catch { throw new Problem(400,'Invalid JSON.'); }
        if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Problem(400,'Invalid preview request.');
        if (!UUID.test(body.requestId || '') || (body.repository && body.repository !== REPOSITORY)) throw new Problem(400,'Only the connected 1origin project is supported.');
        const branch = body.branch || 'main';
        if (typeof branch !== 'string' || !/^[A-Za-z0-9_./-]{1,128}$/.test(branch) || branch.includes('..') || branch.startsWith('/')) throw new Problem(400,'Invalid branch.');
        // Resolve through the existing App broker. Credentials never enter CodeBuild.
        const resolved = await aws('lambda','Invoke',{FunctionName:broker,Payload:Buffer.from(JSON.stringify({
          rawPath:'/github/import',queryStringParameters:{repository:REPOSITORY,ref:branch},
          requestContext:{http:{method:'GET'},authorizer:{jwt:{claims}}}
        }))});
        if (resolved.FunctionError) throw new Problem(503,'Repository connection unavailable.');
        const response = JSON.parse(Buffer.from(resolved.Payload).toString('utf8'));
        if (response.statusCode !== 200) throw new Problem(422,'Cannot resolve this branch through the connected GitHub App.');
        const source = JSON.parse(response.body).repository;
        if (source?.fullName !== REPOSITORY || !SHA.test(source.commitSha || '') || source.private !== false) throw new Problem(422,'Preview currently supports only the connected public repository.');
        const env = {COMMIT_SHA:source.commitSha,SOURCE_BRANCH:branch,OWNER_HASH:owner,PREVIEW_ID:body.requestId};
        const started = await aws('codebuild','StartBuild',{
          projectName:project,idempotencyToken:hash(owner+':'+body.requestId),
          environmentVariablesOverride:Object.entries(env).map(([name,value])=>({name,value,type:'PLAINTEXT'})),
          artifactsOverride:{type:'S3',location:bucket,path:'previews',name:body.requestId,namespaceType:'NONE',packaging:'NONE',overrideArtifactName:false,encryptionDisabled:true}
        });
        return reply(202,{build:present(started.build)});
      }
      if (path === '/previews' && method === 'GET') {
        const listed = await aws('codebuild','ListBuildsForProject',{projectName:project,sortOrder:'DESCENDING'});
        const ids = (listed.ids || []).slice(0,50);
        const builds = ids.length ? (await aws('codebuild','BatchGetBuilds',{ids})).builds || [] : [];
        return reply(200,{builds:builds.filter(b=>variables(b).OWNER_HASH===owner).map(present),limitedTo:50});
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
    const clients = {codebuild:new cb.CodeBuildClient({maxAttempts:1}),lambda:new lf.LambdaClient({maxAttempts:1}),logs:new cw.CloudWatchLogsClient({maxAttempts:1})};
    const commands = {...cb,...lf,...cw};
    runtime = createHandler({project:process.env.PROJECT,broker:process.env.BROKER,bucket:process.env.BUCKET,domain:process.env.PREVIEW_DOMAIN,
      aws:(service,operation,input)=>clients[service].send(new commands[operation+'Command'](input))});
  }
  return runtime(event);
};
exports.createHandler = createHandler;
