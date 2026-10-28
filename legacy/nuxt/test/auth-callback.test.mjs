import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Run the real callback script with router hydration intentionally lagging the URL.
// Only external lifecycle/auth/navigation boundaries are doubled; parsing stays real.
async function mountCallback(search) {
  const source=readFileSync(new URL('../app/pages/auth/callback.vue',import.meta.url),'utf8');
  const script=source.match(/<script setup lang="ts">([\s\S]*?)<\/script>/)[1];
  const compiled=ts.transpileModule(script,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const mounts=[],ready=[],exchanges=[],navigations=[],messages=[];
  const context={exports:{},URLSearchParams,window:{location:{search:''}},
    onNuxtReady:fn=>ready.push(fn),
    require(name){assert.equal(name,'vue');return {onMounted:fn=>mounts.push(fn),ref:value=>{const ref={value};messages.push(ref);return ref}}},
    useRoute:()=>({query:{}}),
    useOriginAuth:()=>({state:{},signIn:()=>{},completeSignIn:async(code,state)=>{exchanges.push({code,state});return '/preview'}}),
    navigateTo:async(path,options)=>navigations.push({path,replace:options.replace})};
  vm.runInNewContext(compiled,context);
  // Nuxt's prerendered route temporarily replaces the URL while hydrating,
  // then restores it on app:suspense:resolve (before onNuxtReady callbacks).
  for (const fn of mounts) await fn();
  context.window.location.search=search;
  for (const fn of ready) await fn();
  return {exchanges,navigations,messages:messages.map(x=>x.value)};
}
test('callback uses returned URL even before Nuxt router query hydration',async()=>{
  const result=await mountCallback('?code=diagnostic-code&state=diagnostic-state');
  assert.deepEqual(result.exchanges,[{code:'diagnostic-code',state:'diagnostic-state'}]);
  assert.deepEqual(result.navigations,[{path:'/preview',replace:true}]);
  assert.ok(result.messages.includes(true));
});
test('missing state never attempts token exchange or successful navigation',async()=>{
  const result=await mountCallback('?code=diagnostic-code');
  assert.equal(result.exchanges.length,0);
  assert.equal(result.navigations.length,0);
  assert.ok(result.messages.some(x=>typeof x==='string'&&x.includes('No valid authorization code')));
});
test('provider error from callback URL is shown without attempting token exchange',async()=>{
  const result=await mountCallback('?error=access_denied&error_description=Access+was+denied');
  assert.equal(result.exchanges.length,0);
  assert.ok(result.messages.includes('Access was denied'));
});
