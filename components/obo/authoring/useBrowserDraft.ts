'use client';
import {problemToken} from '@/lib/problemApi';
import {useEffect,useRef,useState} from 'react';
import {AUTH_CHANGED,BEFORE_LOGOUT} from '@/lib/authSession';

type RecordValue<T>={v:1;scope:string;id:string;savedAt:string;value:T};
function account(token:string|null){
  if(!token)return null;
  try {const payload=JSON.parse(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));return String(payload.sub??payload.userId??'')||null;}catch{return null;}
}
export function useBrowserDraft<T>({documentId,value,restore,enabled,valid}:{documentId:string;value:T;restore:(v:T)=>void;enabled:boolean;valid:(v:unknown)=>v is T}){
 const [status,setStatus]=useState('브라우저 초안 준비 중');
 const [candidates,setCandidates]=useState<RecordValue<T>[]>([]);
 const [ready,setReady]=useState(false);
 const [locked,setLocked]=useState(false);
 const current=useRef(value);current.current=value;
 const restoreRef=useRef(restore);restoreRef.current=restore;
 const validRef=useRef(valid);validRef.current=valid;
 const context=useRef<{scope:string;key:string;user:string;baseline:string}|null>(null);
 const suspended=useRef(false);
 useEffect(()=>{
  if(!enabled){setReady(false);setCandidates([]);context.current=null;return;}
  let user:string|null=null;try{user=account(problemToken());}catch{setStatus('브라우저 보관함에 접근하지 못했습니다. 파일로 보관하세요.');return;}
  if(!user){setStatus('계정을 확인할 수 없어 자동 보관을 시작하지 않았습니다. 파일로 보관할 수 있습니다.');return;}
  const scope=`obo:problem-draft:v1:${encodeURIComponent(user)}:${encodeURIComponent(documentId)}:`;
  suspended.current=false;
  context.current={scope,key:scope+crypto.randomUUID(),user,baseline:JSON.stringify(current.current)};
  const scan=()=>{
   const records:RecordValue<T>[]=[];let corrupt=false;
   try {for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i)!;if(!key.startsWith(scope))continue;
    try {const r=JSON.parse(localStorage.getItem(key)!);if(r.v!==1||r.scope!==scope||r.id!==key||typeof r.savedAt!=='string'||!Number.isFinite(Date.parse(r.savedAt))||!validRef.current(r.value))throw Error();if(key!==context.current?.key)records.push(r);}catch{corrupt=true;}
   }}catch{setStatus('브라우저 보관함에 접근하지 못했습니다. 파일로 보관하세요.');}
   setCandidates(records.sort((a,b)=>b.savedAt.localeCompare(a.savedAt)));
   if(corrupt)setStatus('읽을 수 없는 이전 초안이 있습니다. 원본은 삭제하지 않았습니다.');
  };
  setReady(true);setStatus('이 브라우저에 자동 보관 · 서버에는 아직 저장되지 않음');scan();
  const auth=()=>{let next:string|null=null;try{next=account(problemToken());}catch{}if(next===user)return;
   // The captured key still belongs to the outgoing account, including cross-tab logout.
   const c=context.current;
   if(c&&!suspended.current&&JSON.stringify(current.current)!==c.baseline){try{localStorage.setItem(c.key,JSON.stringify({v:1,scope:c.scope,id:c.key,savedAt:new Date().toISOString(),value:current.current}));}catch{}}
   suspended.current=true;setReady(false);setCandidates([]);setLocked(true);setStatus('계정이 바뀌었습니다. 다시 로그인하고 작성 화면을 열어 주세요.');
  };
  const change=(e:StorageEvent)=>{if(e.key==='token'||e.key===null)auth();else if(e.key?.startsWith(scope))scan();};
  const beforeLogout=(e:Event)=>{if(context.current&&JSON.stringify(current.current)!==context.current.baseline&&!saveRef.current()){
   if(!window.confirm('초안을 보관하지 못했습니다. 취소 후 파일로 보관할 수 있습니다. 보관하지 않은 내용을 버리고 로그아웃할까요?'))e.preventDefault();
  }};
  window.addEventListener('storage',change);window.addEventListener(AUTH_CHANGED,auth);window.addEventListener(BEFORE_LOGOUT,beforeLogout);
  return()=>{window.removeEventListener('storage',change);window.removeEventListener(AUTH_CHANGED,auth);window.removeEventListener(BEFORE_LOGOUT,beforeLogout);};
 },[documentId,enabled]);
 const save=()=>{
  const c=context.current;if(!c||suspended.current)return false;
  try {
   if(account(problemToken())!==c.user)throw Error('account');
   const record:RecordValue<T>={v:1,scope:c.scope,id:c.key,savedAt:new Date().toISOString(),value:current.current};
   localStorage.setItem(c.key,JSON.stringify(record));
   setStatus(`브라우저 보관 완료 · ${new Date(record.savedAt).toLocaleTimeString('ko-KR')} · 서버 저장 전`);return true;
  } catch {setStatus('브라우저 보관 실패. 작성 내용은 화면에 유지됩니다. 파일로 보관하세요.');return false;}
 };
 const saveRef=useRef(save);saveRef.current=save;
 const checkpoint=()=>{
  if(!save())return false;const c=context.current;if(!c)return false;
  const saved:RecordValue<T>={v:1,scope:c.scope,id:c.key,savedAt:new Date().toISOString(),value:current.current};
  setCandidates(previous=>[saved,...previous.filter(r=>r.id!==saved.id)]);
  c.key=c.scope+crypto.randomUUID();return true;
 };
 const serialized=JSON.stringify(value);
 useEffect(()=>{if(!enabled||!ready||serialized===context.current?.baseline)return;const timer=setTimeout(()=>saveRef.current(),500);return()=>clearTimeout(timer);},[serialized,ready,enabled]);
 useEffect(()=>{
  const flush=()=>{if(context.current&&JSON.stringify(current.current)!==context.current.baseline)saveRef.current();};
  const unload=(e:BeforeUnloadEvent)=>{if(context.current&&JSON.stringify(current.current)!==context.current.baseline){flush();e.preventDefault();e.returnValue='';}};
  window.addEventListener('pagehide',flush);window.addEventListener('beforeunload',unload);
  return()=>{window.removeEventListener('pagehide',flush);window.removeEventListener('beforeunload',unload);};
 },[]);
 return {status,ready,locked,candidates,save,checkpoint,
  deleteSaved:()=>{const c=context.current;if(!c||suspended.current)return;try{for(let i=localStorage.length-1;i>=0;i--){const key=localStorage.key(i)!;if(key.startsWith(c.scope))localStorage.removeItem(key);}c.baseline=JSON.stringify(current.current);setCandidates([]);setStatus('이 문서의 브라우저 보관본을 삭제했습니다. 다시 편집하면 보관됩니다.');}catch{setStatus('보관본 삭제 실패. 브라우저 저장소 접근 권한을 확인하세요.');}},
  recover:(record:RecordValue<T>)=>{if(!checkpoint())return;restoreRef.current(record.value);setStatus('초안을 복구했습니다. 서버 저장 전 내용을 확인하세요.');},
  exportFile:()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(current.current,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='obo-problem-draft.json';a.click();URL.revokeObjectURL(url);},
  markSaved:()=>{const c=context.current;if(c){suspended.current=true;c.baseline=JSON.stringify(current.current);try{localStorage.removeItem(c.key);}catch{setStatus('서버 저장 완료 · 이전 브라우저 보관본은 남아 있습니다.');return;}}setStatus('서버 저장 완료');},
 };
}
