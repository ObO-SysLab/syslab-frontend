/** Local previews never fall through to the production API. */
export function problemApi(path:string){
 const configured=process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/,'');
 if(configured)return configured+path;
 if(typeof window!=='undefined'&&['localhost','127.0.0.1','[::1]'].includes(window.location.hostname))return path;
 return 'https://diveon.net'+path;
}
export function problemToken(){
 if(typeof window==='undefined')return null;
 if(process.env.NODE_ENV==='development'&&['localhost','127.0.0.1'].includes(window.location.hostname)){
  const preview=sessionStorage.getItem('obo:preview:token');if(preview)return preview;
 }
 return localStorage.getItem('token');
}
