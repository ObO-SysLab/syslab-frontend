'use client';
import {problemToken} from '@/lib/problemApi';
import {useEffect,useRef,useState} from 'react';
import {AUTH_CHANGED,BEFORE_LOGOUT} from '@/lib/authSession';

type RecordValue<T>={v:1;scope:string;id:string;savedAt:string;value:T};
function account(token:string|null){
  if(!token)return null;
  try {const payload=JSON.parse(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));return String(payload.sub??payload.userId??'')||null;}catch{return null;}
}
export const LEAVE_UNSAVED='보관하지 않은 작성 내용은 사라집니다. 이 화면을 나갈까요?';

/** A same-tab link that leaves this page (not a new tab, download or in-page anchor). */
export function leavesPage(event:MouseEvent,here:Location):boolean {
  if(event.defaultPrevented||event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return false;
  const link=(event.target as Element|null)?.closest?.('a[href]') as HTMLAnchorElement|null;
  if(!link||(link.target&&link.target!=='_self')||link.hasAttribute('download'))return false;
  const next=new URL(link.href,here.href);
  return !(next.origin===here.origin&&next.pathname===here.pathname&&next.search===here.search);
}

/**
 * Browser drafts for the problem authoring page.
 * 2026-11-10 (user QA): nothing is stored in the background. Records are written only when the author
 * presses 브라우저에 보관 or 문제 등록, or recovers another draft (changed content is kept first; a blank or
 * already-kept screen is not copied again, team QA the same evening).
 * Leaving with edits that were never kept asks first instead of storing them silently.
 */
export function useBrowserDraft<T>({documentId,value,restore,enabled,valid}:{documentId:string;value:T;restore:(v:T)=>void;enabled:boolean;valid:(v:unknown)=>v is T}){
 const [status,setStatus]=useState('브라우저 초안 준비 중');
 const [candidates,setCandidates]=useState<RecordValue<T>[]>([]);
 const [ready,setReady]=useState(false);
 const [locked,setLocked]=useState(false);
 const [restored,setRestored]=useState(0);
 const current=useRef(value);current.current=value;
 const restoreRef=useRef(restore);restoreRef.current=restore;
 const validRef=useRef(valid);validRef.current=valid;
 // baseline: the content last kept (or opened); initial: the content when the page opened.
 const context=useRef<{scope:string;key:string;user:string;baseline:string;initial:string}|null>(null);
 const suspended=useRef(false);
 // Turning the hook off (practice type) and on again keeps what counts as unchanged for the same document.
 const parked=useRef<{documentId:string;user:string;baseline:string;initial:string}|null>(null);
 // Set once the author agreed to throw edits away (leave or log out), so no later guard asks or stores again.
 const leaving=useRef(false);
 const dirty=()=>{const c=context.current;return !!c&&!suspended.current&&!leaving.current&&JSON.stringify(current.current)!==c.baseline;};
 const dirtyRef=useRef(dirty);dirtyRef.current=dirty;
 useEffect(()=>{
  if(!enabled){const c=context.current;if(c&&!suspended.current)parked.current={documentId,user:c.user,baseline:c.baseline,initial:c.initial};
   setReady(false);setCandidates([]);context.current=null;return;}
  let user:string|null=null;try{user=account(problemToken());}catch{setStatus('브라우저 보관함에 접근하지 못했습니다. 파일로 보관하세요.');return;}
  if(!user){setStatus('계정을 확인할 수 없어 브라우저에 보관할 수 없습니다. 파일로 보관할 수 있습니다.');return;}
  const scope=`obo:problem-draft:v1:${encodeURIComponent(user)}:${encodeURIComponent(documentId)}:`;
  suspended.current=false;leaving.current=false;
  const opened=JSON.stringify(current.current),back=parked.current?.documentId===documentId&&parked.current.user===user?parked.current:null;
  parked.current=null;
  context.current={scope,key:scope+crypto.randomUUID(),user,baseline:back?.baseline??opened,initial:back?.initial??opened};
  const scan=()=>{
   const records:RecordValue<T>[]=[];let corrupt=false;
   try {for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i)!;if(!key.startsWith(scope))continue;
    try {const r=JSON.parse(localStorage.getItem(key)!);if(r.v!==1||r.scope!==scope||r.id!==key||typeof r.savedAt!=='string'||!Number.isFinite(Date.parse(r.savedAt))||!validRef.current(r.value))throw Error();if(key!==context.current?.key)records.push(r);}catch{corrupt=true;}
   }}catch{setStatus('브라우저 보관함에 접근하지 못했습니다. 파일로 보관하세요.');}
   setCandidates(records.sort((a,b)=>b.savedAt.localeCompare(a.savedAt)));
   if(corrupt)setStatus('읽을 수 없는 이전 초안이 있습니다. 원본은 삭제하지 않았습니다.');
  };
  setReady(true);setStatus('브라우저에 보관하지 않음 · 서버 저장 전');scan();
  const auth=()=>{let next:string|null=null;try{next=account(problemToken());}catch{}if(next===user)return;
   // Another tab changed the account: this tab closes without a chance to ask, so unkept edits go to the outgoing account.
   const c=context.current;
   if(c&&dirtyRef.current()){try{localStorage.setItem(c.key,JSON.stringify({v:1,scope:c.scope,id:c.key,savedAt:new Date().toISOString(),value:current.current}));}catch{}}
   suspended.current=true;setReady(false);setCandidates([]);setLocked(true);setStatus('계정이 바뀌었습니다. 다시 로그인하고 작성 화면을 열어 주세요.');
  };
  const change=(e:StorageEvent)=>{if(e.key==='token'||e.key===null)auth();else if(e.key?.startsWith(scope))scan();};
  const beforeLogout=(e:Event)=>{if(!dirtyRef.current())return;
   if(window.confirm('보관하지 않은 작성 내용은 사라집니다. 로그아웃할까요?'))leaving.current=true;else e.preventDefault();
  };
  window.addEventListener('storage',change);window.addEventListener(AUTH_CHANGED,auth);window.addEventListener(BEFORE_LOGOUT,beforeLogout);
  return()=>{window.removeEventListener('storage',change);window.removeEventListener(AUTH_CHANGED,auth);window.removeEventListener(BEFORE_LOGOUT,beforeLogout);};
 },[documentId,enabled]);
 const save=()=>{
  const c=context.current;if(!c||suspended.current)return false;
  try {
   if(account(problemToken())!==c.user)throw Error('account');
   const record:RecordValue<T>={v:1,scope:c.scope,id:c.key,savedAt:new Date().toISOString(),value:current.current};
   localStorage.setItem(c.key,JSON.stringify(record));c.baseline=JSON.stringify(record.value);
   setStatus(`브라우저 보관 완료 · ${new Date(record.savedAt).toLocaleTimeString('ko-KR')} · 서버 저장 전`);return true;
  } catch {setStatus('브라우저 보관 실패. 작성 내용은 화면에 유지됩니다. 파일로 보관하세요.');return false;}
 };
 const checkpoint=()=>{
  if(!save())return false;const c=context.current;if(!c)return false;
  const saved:RecordValue<T>={v:1,scope:c.scope,id:c.key,savedAt:new Date().toISOString(),value:current.current};
  setCandidates(previous=>[saved,...previous.filter(r=>r.id!==saved.id)]);
  c.key=c.scope+crypto.randomUUID();return true;
 };
 // A recovered draft is already kept, so the screen right after recovery counts as unchanged.
 const serialized=JSON.stringify(value);
 useEffect(()=>{if(restored&&context.current)context.current.baseline=serialized;},[restored]); // eslint-disable-line react-hooks/exhaustive-deps
 useEffect(()=>{
  const unload=(e:BeforeUnloadEvent)=>{if(dirtyRef.current()){e.preventDefault();e.returnValue='';}};
  const click=(e:MouseEvent)=>{
   if(!dirtyRef.current()||!leavesPage(e,window.location))return;
   if(window.confirm(LEAVE_UNSAVED)){leaving.current=true;return;}
   e.preventDefault();e.stopPropagation();
  };
  window.addEventListener('beforeunload',unload);document.addEventListener('click',click,true);
  return()=>{window.removeEventListener('beforeunload',unload);document.removeEventListener('click',click,true);};
 },[]);
 return {status,ready,locked,candidates,save,checkpoint,dirty,
  deleteSaved:()=>{const c=context.current;if(!c||suspended.current)return;try{for(let i=localStorage.length-1;i>=0;i--){const key=localStorage.key(i)!;if(key.startsWith(c.scope))localStorage.removeItem(key);}c.baseline=c.initial;setCandidates([]);setStatus('이 문서의 브라우저 보관본을 삭제했습니다.');}catch{setStatus('보관본 삭제 실패. 브라우저 저장소 접근 권한을 확인하세요.');}},
  recover:(record:RecordValue<T>)=>{
   const c=context.current;if(!c||suspended.current)return;
   // Team QA 2026-11-10: a screen still as opened (a blank new problem) or identical to what is already kept
   // is not copied again; anything else is kept first so recovery never loses work.
   const now=JSON.stringify(current.current),keep=now!==c.baseline&&now!==c.initial;
   if(keep){if(!checkpoint())return;}
   else{
    // A copy saved earlier under this visit's key stays listed, and later saves must not overwrite it.
    try{const kept=localStorage.getItem(c.key);if(kept){const r=JSON.parse(kept) as RecordValue<T>;setCandidates(previous=>[r,...previous.filter(x=>x.id!==r.id)]);}}catch{}
    c.key=c.scope+crypto.randomUUID();
   }
   restoreRef.current(record.value);setRestored(n=>n+1);
   setStatus(`${keep?'현재 내용을 보관하고 ':''}선택한 초안을 불러왔습니다. 서버 저장 전입니다.`);
  },
  exportFile:()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(current.current,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='obo-problem-draft.json';a.click();URL.revokeObjectURL(url);},
  markSaved:()=>{const c=context.current;if(c){suspended.current=true;c.baseline=JSON.stringify(current.current);try{localStorage.removeItem(c.key);}catch{setStatus('서버 저장 완료 · 이전 브라우저 보관본은 남아 있습니다.');return;}}setStatus('서버 저장 완료');},
 };
}
