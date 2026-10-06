import {state,canEdit,id} from './store.js';
export const MAX_FILE_SIZE=20*1024*1024;
export async function uploadAttachment(file,projectId){
 if(!canEdit())throw Error('編集権限が必要です');
 if(!file?.size)throw Error('ファイルを選択してください');
 if(file.size>MAX_FILE_SIZE)throw Error('1ファイル20MBまで添付できます');
 if(state.preview){if(file.size>150000)throw Error('体験モードの添付は150KBまでです。共同利用では20MBまで添付できます');const data=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file)});return {name:file.name,size:file.size,mime:file.type,data};}
 const path=`${projectId}/${id()}`;
 const {error}=await state.client.storage.from('school-files').upload(path,file,{contentType:file.type||'application/octet-stream',upsert:false});if(error)throw error;
 return {path,name:file.name,size:file.size,mime:file.type||'application/octet-stream'};
}
export async function attachmentURL(file){if(file.data)return file.data;const {data,error}=await state.client.storage.from('school-files').createSignedUrl(file.path,300);if(error)throw error;return data.signedUrl;}
export async function downloadAttachment(file){const url=await attachmentURL(file);const response=await fetch(url);if(!response.ok)throw Error('ファイルを取得できません');const blob=await response.blob();const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=file.name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
