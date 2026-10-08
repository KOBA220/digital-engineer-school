import {state,list,put} from './store.js';
export const officeFiles=projectId=>list('resource',projectId).filter(e=>e.payload.category==='office-file');
export const officeChanges=(projectId,docId)=>list('resource',projectId).filter(e=>e.payload.category==='office-edit'&&e.payload.docId===docId);
export const editMap=(projectId,docId)=>Object.fromEntries(officeChanges(projectId,docId).map(e=>[e.payload.key,e.payload.value]));
export async function fieldId(docId,key){const bytes=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(docId+'\n'+key)));bytes[6]=(bytes[6]&15)|80;bytes[8]=(bytes[8]&63)|128;const s=Array.from(bytes.slice(0,16),b=>b.toString(16).padStart(2,'0')).join('');return `${s.slice(0,8)}-${s.slice(8,12)}-${s.slice(12,16)}-${s.slice(16,20)}-${s.slice(20)}`;}
export function editDecision(base,current,desired){if(current===desired)return 'saved';return current===base?'save':'conflict';}
export async function saveOfficeField({projectId,docId,key,base,original,value}){
 const doc=officeFiles(projectId).find(e=>e.id===docId);if(!doc)throw Error('ファイルの登録が見つかりません');
 const entityId=await fieldId(docId,key);
 for(let attempt=0;attempt<2;attempt++){
  const row=state.entities.find(e=>e.id===entityId&&!e.deleted&&e.project_id===projectId),current=row?.payload.value??original;
  const decision=editDecision(base,current,value);
  if(decision==='saved')return;
  if(decision==='conflict'){const error=new Error('同じ項目を他の人が変更しました');error.conflict=true;error.remote=current;throw error;}
  try{await put(projectId,'resource',{category:'office-edit',docId,key,value},entityId,row?.version||0);return;}catch(error){if(!error.message.includes('他の人が更新')||attempt===1)throw error;}
 }
}
