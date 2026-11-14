import {tokenExpired} from './authToken';

/** Local previews never fall through to the production API. */
export function problemApi(path:string){
 const configured=process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/,'');
 if(typeof window!=='undefined'&&['localhost','127.0.0.1','[::1]'].includes(window.location.hostname)){
  if(configured){try{const target=new URL(configured);if(['localhost','127.0.0.1','[::1]'].includes(target.hostname)&&['http:','https:'].includes(target.protocol))return configured+path;}catch{}}
  return path;
 }
 if(configured)return configured+path;
 return 'https://diveon.net'+path;
}
export function problemToken(){
 if(typeof window==='undefined')return null;
 try{
 if(process.env.NODE_ENV==='development'&&['localhost','127.0.0.1'].includes(window.location.hostname)){
  const preview=sessionStorage.getItem('obo:preview:token');if(preview)return preview;
 }
 // A token that expired while the tab stayed open counts as signed out.
 const token=localStorage.getItem('token');
 return tokenExpired(token)?null:token;
 }catch{return null;}
}
