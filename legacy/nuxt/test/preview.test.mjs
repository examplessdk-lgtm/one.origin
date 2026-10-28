import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createPreviewClient} from '../app/utils/preview.ts';
test('build submission is never automatically retried after an ambiguous failure',async()=>{
  let calls=0;
  const client=createPreviewClient(()=> 'token',async()=>{calls++; throw Error('offline');});
  await assert.rejects(client.start('11111111-2222-4333-8444-555555555555','main'),/offline/);
  assert.equal(calls,1);
});
test('unsigned user is rejected before fetching',async()=>{
  let calls=0;
  const client=createPreviewClient(()=>'',async()=>{calls++; return Response.json({});});
  await assert.rejects(client.history(),/Sign in/);
  assert.equal(calls,0);
});
test('uses bearer header and safely encodes logs identifier',async()=>{
  let seen;
  const client=createPreviewClient(()=> 'token',async(url,options)=>{seen={url,options};return Response.json({events:[]});});
  await client.logs('one/two');
  assert.equal(new URL(seen.url).searchParams.get('id'),'one/two');
  assert.equal(seen.options.headers.Authorization,'Bearer token');
  assert.equal(seen.options.credentials,'omit');
});
