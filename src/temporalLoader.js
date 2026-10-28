import {assetUrl} from './assetUrl';
const jsonCache=new Map();
export function temporalUrl(file){
  const path=String(file).replace(/^\/+/, '');
  return assetUrl(path.startsWith('enterprise/')?path:`enterprise/temporal/${path}`);
}
export async function readTemporalJSON(file,cache=true){
  const url=temporalUrl(file);
  if(cache&&jsonCache.has(url)){const promise=jsonCache.get(url);jsonCache.delete(url);jsonCache.set(url,promise);return promise;}
  const promise=fetch(url).then(async response=>{
    if(!response.ok||response.headers.get('content-type')?.includes('text/html')){const error=new Error('时序数据正在准备');error.preparing=response.status===404||response.headers.get('content-type')?.includes('text/html');throw error;}
    return response.json();
  }).catch(error=>{jsonCache.delete(url);throw error;});
  if(cache){jsonCache.set(url,promise);while(jsonCache.size>8)jsonCache.delete(jsonCache.keys().next().value);}
  return promise;
}
