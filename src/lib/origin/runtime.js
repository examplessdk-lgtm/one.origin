import {createOriginAuth} from './auth';
import {createOriginClient} from './client';
export const originConfig={
  enabled:import.meta.env.VITE_ORIGIN_ENABLED!=='false' && typeof window!=='undefined' && window.location.origin==='https://os.1origin.dev',
  apiUrl:import.meta.env.VITE_ORIGIN_API_URL||'https://7a158myew1.execute-api.ap-southeast-1.amazonaws.com',
  cognitoDomain:import.meta.env.VITE_ORIGIN_COGNITO_DOMAIN||'https://origin1auth20261023sdk.auth.ap-southeast-1.amazoncognito.com',
  clientId:import.meta.env.VITE_ORIGIN_COGNITO_CLIENT_ID||'e7appf35fu05827fukilfqd0h',
};
let runtime;
export function getOriginRuntime(){
  if(typeof window==='undefined')throw new Error('AWS operator actions require a browser.');
  if(!runtime){
    const auth=createOriginAuth({enabled:originConfig.enabled,storage:window.sessionStorage,location:window.location,cryptoApi:window.crypto,clientId:originConfig.clientId,domain:originConfig.cognitoDomain});
    const client=createOriginClient({enabled:originConfig.enabled,baseUrl:originConfig.apiUrl,getToken:()=>auth.getSession()?.accessToken||''});
    runtime={auth,client};
  }
  return runtime;
}
