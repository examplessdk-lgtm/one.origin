import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const template=JSON.parse(readFileSync(new URL('../infra/aws/origin-preview.cloudformation.json',import.meta.url)));
const operations=JSON.parse(readFileSync(new URL('../infra/aws/origin-operations-api.cloudformation.json',import.meta.url)));
test('deployed Lambda source is the tested source and project routes retain JWT authorizer',()=>{
 assert.equal(template.Resources.Function.Properties.Code.ZipFile,readFileSync(new URL('../backend/preview.cjs',import.meta.url),'utf8'));
 for(const key of ['ProjectsListRoute','ProjectsCreateRoute','ProjectBuildsRoute','ProjectStartRoute','ProductionListRoute','ProductionCreateRoute']){
  const route=template.Resources[key].Properties;assert.equal(route.AuthorizationType,'JWT');assert.deepEqual(route.AuthorizerId,{Ref:'AuthorizerId'});
 }
});
test('production storage survives previews while build workers cannot write production',()=>{
 const bucket=template.Resources.Bucket;
 assert.equal(bucket.DeletionPolicy,'Retain');assert.equal(bucket.Properties.LifecycleConfiguration.Rules[0].Prefix,'previews/');
 assert.equal(template.Resources.Projects.DeletionPolicy,'Retain');assert.equal(template.Resources.Projects.Properties.SSESpecification.SSEEnabled,true);
 const buildPolicy=JSON.stringify(template.Resources.BuildRole.Properties.Policies);
 assert.match(buildPolicy,/previews/);assert.doesNotMatch(buildPolicy,/production|dynamodb|secretsmanager/i);
 const api=JSON.stringify(template.Resources.ApiRole.Properties.Policies);assert.match(api,/production/);assert.doesNotMatch(api,/s3:DeleteObject|secretsmanager/);
});
test('new origin is added alongside existing callback/logout and exact CORS origins',()=>{
 const client=operations.Resources.WebClient.Properties;
 assert.ok(client.CallbackURLs.includes('https://os.1origin.dev/hosting/callback'));
 assert.ok(client.CallbackURLs.includes('https://d1x9cuojzyjcbw.cloudfront.net/auth/callback'));
 assert.ok(client.LogoutURLs.includes('https://os.1origin.dev/hosting'));
 assert.deepEqual(new Set(operations.Resources.Api.Properties.CorsConfiguration.AllowOrigins),new Set(['https://d1x9cuojzyjcbw.cloudfront.net','https://os.1origin.dev']));
 assert.equal(client.GenerateSecret,false);assert.deepEqual(client.AllowedOAuthFlows,['code']);
});
