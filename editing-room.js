import {state,put,canEdit} from './store.js';
import {uploadAttachment,attachmentURL} from './attachments.js';
import {readOffice,exportOffice,officeExtension,officeMime,fieldValue,columnName,parseCellAddress} from './office-file.js';
import {officeFiles,editMap,saveOfficeField} from './office-edit-data.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let currentSession=null;
export async function flushOfficeEditor(){if(currentSession)await currentSession.flush();}
export function editingRoomHTML(){return `<section id="editing-room" class="editing-room"><div class="editing-intro"><div><span class="section-label">みんなの編集机</span><h2>ファイルを開いて、一緒に編集する。</h2><p>Wordの本文・Excelのセル・PowerPointの文字を、この部屋で編集できます。</p></div><label class="button primary office-upload-label">＋ ファイルを読み込む<input id="office-upload" type="file" accept=".docx,.xlsx,.pptx" ${canEdit()?'':'disabled'}></label></div><p class="muted">対応：.docx / .xlsx / .pptx · 20MBまで。本文・セル・文字の編集モードです。図形の移動、画像の追加、フォント変更、Officeと同じレイアウト表示は未対応です。Excelの数式は保存できますが、この画面では再計算しません。</p><div class="office-desk"><aside class="office-file-shelf"><h3>プロジェクトのファイル</h3><div id="office-file-list"></div></aside><section id="office-editor" class="office-editor"><div class="empty">左のファイルを開くか、Officeファイルを読み込んでください。</div></section></div></section>`;}
export function bindEditingRoom({projectId,item,onOpen,notify,dialog}){
 const root=document.querySelector('#editing-room');if(!root)return ()=>{};
 const files=root.querySelector('#office-file-list'),pane=root.querySelector('#office-editor'),upload=root.querySelector('#office-upload');
 let disposed=false,model=null,documentId=null,sectionIndex=0,offset=0,rowStart=1,colStart=1,loading=0,working=false,savePromise=null;
 const pending=new Map(),timers=new Map();
 const changes=()=>editMap(projectId,documentId);
 const status=(text,error=false)=>{const element=pane.querySelector('#office-save-status');if(element){element.textContent=text;element.classList.toggle('error',error);}};
 function drawFiles(){files.innerHTML=officeFiles(projectId).map(e=>`<button class="office-file-card ${e.id===documentId?'active':''}" data-office-file="${e.id}"><span class="tag">${esc(e.payload.ext.toUpperCase())}</span><strong>${esc(e.payload.title)}</strong><small>開いて編集 →</small></button>`).join('')||'<p class="muted">まだ読み込んだファイルがありません。</p>';files.querySelectorAll('[data-office-file]').forEach(b=>b.onclick=async()=>{try{await flush();onOpen(b.dataset.officeFile);}catch(e){notify(e.message);}});}
 async function openFile(id){
  const row=officeFiles(projectId).find(e=>e.id===id);if(!row){pane.innerHTML='<div class="empty">このファイルは見つからないか、閲覧権限がありません。</div>';return;}
  documentId=id;drawFiles();pane.innerHTML='<div class="empty" role="status">ファイルを読み込んでいます…</div>';const sequence=++loading;
  try{const response=await fetch(await attachmentURL(row.payload.source));if(!response.ok)throw Error('ファイルを取得できません');const loaded=await readOffice(new Uint8Array(await response.arrayBuffer()),row.payload.source.name);
   if(disposed||sequence!==loading)return;model=loaded;drawEditor();
  }catch(e){if(disposed)return;pane.innerHTML=`<div class="empty" role="alert">${esc(e.message)}</div>`;}
 }
 function drawEditor(){
  if(!model)return;const row=officeFiles(projectId).find(e=>e.id===documentId);if(!row)return;
  const section=model.sections[sectionIndex],map=changes();
  pane.innerHTML=`<div class="office-editor-toolbar"><div><h3>${esc(row.payload.title)}</h3><span id="office-save-status" role="status">${state.preview?'この端末だけに保存':'保存済み · 同じプロジェクトで同期'}</span></div><div class="row wrap"><button id="office-save" ${canEdit()?'':'disabled'}>今すぐ保存</button><button id="office-export">編集したファイルをダウンロード</button></div></div><div class="office-editor-tabs">${model.sections.map((s,i)=>`<button data-office-section="${i}" aria-current="${i===sectionIndex?'true':'false'}">${esc(s.label)}</button>`).join('')}</div><div id="office-edit-conflicts" role="alert"></div><div id="office-edit-content"></div>`;
  const content=pane.querySelector('#office-edit-content');
  if(!section){content.innerHTML='<p class="empty">編集できる本文・シート・スライドがありません。</p>';return;}
  if(model.ext==='xlsx'){
   content.innerHTML=`<form id="office-cell-jump" class="office-cell-jump"><label>セルへ移動<input name="address" aria-label="セルの位置" value="${columnName(colStart)+rowStart}" placeholder="例：A1"></label><button>移動</button></form><div class="office-sheet-scroll"><table class="office-sheet"><thead><tr><th></th>${Array.from({length:8},(_,i)=>`<th>${columnName(colStart+i)}</th>`).join('')}</tr></thead><tbody>${Array.from({length:20},(_,i)=>{const r=rowStart+i;return `<tr><th>${r}</th>${Array.from({length:8},(_,j)=>{const address=columnName(colStart+j)+r,key=section.path+'#cell:'+address,f=model.fields[key];return `<td><input data-office-field="${esc(key)}" aria-label="${esc(section.label+' '+address)}" value="${esc(pending.get(key)?.value??fieldValue(model,key,map))}" ${!canEdit()||f?.locked?'readonly':''} ${f?.locked?'title="共有・配列数式のため編集不可"':''}></td>`;}).join('')}</tr>`;}).join('')}</tbody></table></div><div class="row wrap office-pages"><button data-office-grid="up" ${rowStart<=1?'disabled':''}>↑ 前の20行</button><button data-office-grid="down" ${rowStart+20>1048557?'disabled':''}>↓ 次の20行</button><button data-office-grid="left" ${colStart<=1?'disabled':''}>← 前の8列</button><button data-office-grid="right" ${colStart+8>16377?'disabled':''}>次の8列 →</button></div><p class="muted">数式は「=」で入力します。日付・数値の表示書式はこの画面では適用されません。Excelで開いた時に表示書式が反映され、数式が再計算されます。</p>`;
   content.querySelector('#office-cell-jump').onsubmit=async e=>{e.preventDefault();try{await flush();const pos=parseCellAddress(new FormData(e.target).get('address'));if(!pos)throw Error('A1などのセル位置を入力してください');rowStart=Math.min(pos.row,1048557);colStart=Math.min(pos.col,16377);drawEditor();}catch(err){notify(err.message);}};
   content.querySelectorAll('[data-office-grid]').forEach(b=>b.onclick=async()=>{try{await flush();const d=b.dataset.officeGrid;if(d==='up')rowStart=Math.max(1,rowStart-20);if(d==='down')rowStart=Math.min(1048557,rowStart+20);if(d==='left')colStart=Math.max(1,colStart-8);if(d==='right')colStart=Math.min(16377,colStart+8);drawEditor();}catch(e){notify(e.message);}});
  }else{
   const keys=section.keys.slice(offset,offset+100);
   content.innerHTML=`<div class="office-text-page ${model.ext==='pptx'?'office-slide-text':''}"><span class="section-label">${esc(section.label)} · 文字の編集</span>${keys.map(key=>`<label>${esc(model.fields[key].label)}<textarea data-office-field="${esc(key)}" rows="2" maxlength="10000" ${canEdit()?'':'readonly'}>${esc(pending.get(key)?.value??fieldValue(model,key,map))}</textarea></label>`).join('')||'<p>このページに編集できる文字はありません。画像・図形は元のファイルに保持されます。</p>'}</div>${section.keys.length>100?`<div class="row office-pages"><button data-office-page="prev" ${offset===0?'disabled':''}>前の100項目</button><span>${offset+1}〜${Math.min(offset+100,section.keys.length)} / ${section.keys.length}</span><button data-office-page="next" ${offset+100>=section.keys.length?'disabled':''}>次の100項目</button></div>`:''}<p class="muted">文字のまとまりごとに編集します。元ファイルの画像・図形・書式は保持して書き出します。</p>`;
   content.querySelectorAll('[data-office-page]').forEach(b=>b.onclick=async()=>{try{await flush();offset+=b.dataset.officePage==='prev'?-100:100;drawEditor();}catch(e){notify(e.message);}});
  }
  pane.querySelectorAll('[data-office-field]').forEach(control=>{
   control.dataset.base=control.value;
   control.oninput=()=>{
    const key=control.dataset.officeField;if(!canEdit())return;
    const existing=pending.get(key),value=control.value;if(value.length>10000){status('1項目10,000文字までです',true);return;}
    pending.set(key,{base:existing?.base??control.dataset.base??fieldValue(model,key,changes()),value,conflict:existing?.conflict||false});
    clearTimeout(timers.get(key));timers.set(key,setTimeout(()=>saveAll().catch(()=>{}),650));status('未保存 · 自動保存を待っています');
   };
   control.onblur=()=>{if(pending.has(control.dataset.officeField))saveAll().catch(()=>{});else syncFields();};
  });
  pane.querySelectorAll('[data-office-section]').forEach(b=>b.onclick=async()=>{try{await flush();sectionIndex=Number(b.dataset.officeSection);offset=0;rowStart=1;colStart=1;drawEditor();}catch(e){notify(e.message);}});
  pane.querySelector('#office-save').onclick=()=>flush().then(()=>notify('編集内容を保存しました')).catch(e=>notify(e.message));
  pane.querySelector('#office-export').onclick=async event=>{
   const button=event.currentTarget;button.disabled=true;
   try{await flush();const bytes=await exportOffice(model,changes()),a=document.createElement('a'),url=URL.createObjectURL(new Blob([bytes],{type:officeMime[model.ext]}));a.href=url;a.download=model.name.replace(/\.[^.]+$/,'')+'-編集済み.'+model.ext;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notify('編集したOfficeファイルを書き出しました');}catch(e){notify(e.message);}finally{button.disabled=false;}
  };
  drawConflicts();
 }
 function syncFields(){if(!model)return;const map=changes();pane.querySelectorAll('[data-office-field]').forEach(control=>{const key=control.dataset.officeField;if(!pending.has(key)&&document.activeElement!==control){control.value=fieldValue(model,key,map);control.dataset.base=control.value;}});}
 function drawConflicts(){const target=pane.querySelector('#office-edit-conflicts');if(!target)return;target.innerHTML=Array.from(pending).filter(([,p])=>p.conflict).map(([key,p])=>`<div class="office-conflict"><strong>同じ項目に他の人の変更があります</strong><p>項目：${esc(model.fields[key]?.label||key.split(':').pop())}</p><p>相手の内容：${esc(p.remote)}</p><p>自分の内容：${esc(p.value)}</p><button data-office-remote="${esc(key)}">相手の内容を採用</button><button data-office-mine="${esc(key)}">自分の内容で保存</button></div>`).join('');
  target.querySelectorAll('[data-office-remote]').forEach(b=>b.onclick=()=>{pending.delete(b.dataset.officeRemote);syncFields();drawConflicts();status(pending.size?'未保存の項目があります':'保存済み');});
  target.querySelectorAll('[data-office-mine]').forEach(b=>b.onclick=()=>{const p=pending.get(b.dataset.officeMine);p.base=p.remote;p.conflict=false;saveAll().catch(()=>{});});
 }
 async function runSave(){
  let failed=false;
  for(const [key,entry] of Array.from(pending)){
   if(entry.conflict){failed=true;continue;}const value=entry.value;
   status('保存中…');
   try{await saveOfficeField({projectId,docId:documentId,key,base:entry.base,original:model.fields[key]?.value||'',value});const current=pending.get(key);if(current?.value===value)pending.delete(key);else if(current)current.base=value;pane.querySelectorAll('[data-office-field]').forEach(c=>{if(c.dataset.officeField===key)c.dataset.base=value;});}
   catch(e){failed=true;const current=pending.get(key);if(e.conflict&&current){current.conflict=true;current.remote=e.remote;}else notify('保存できませんでした。入力は画面に残っています：'+e.message);}
  }
  drawConflicts();syncFields();status(failed?'未保存 · エラーまたは競合を確認してください':pending.size?'未保存の項目があります':state.preview?'この端末に保存済み':'保存済み · メンバーに反映',failed);return failed;
 }
 async function saveAll(){if(savePromise)return savePromise;if(!pending.size||!model)return;savePromise=runSave();let failed;try{failed=await savePromise;}finally{savePromise=null;}if(pending.size&&!failed){setTimeout(()=>{if(!disposed)saveAll().catch(()=>{});},650);}if(pending.size&&!Array.from(pending.values()).some(p=>p.conflict))status(failed?'未保存 · 「今すぐ保存」で再試行できます':'未保存 · 自動保存を待っています',!!failed);}
 async function flush(){for(const timer of timers.values())clearTimeout(timer);timers.clear();if(savePromise)await savePromise;if(pending.size)await saveAll();if(pending.size)throw Error('保存できていない編集があります。保存エラーまたは競合を解決してから移動してください');if(working)throw Error('ファイルを読み込み中です。完了後に移動してください');}
 upload.onchange=async()=>{
  const file=upload.files?.[0];if(!file)return;upload.disabled=true;working=true;
  try{const ext=officeExtension(file.name),bytes=new Uint8Array(await file.arrayBuffer());await readOffice(bytes,file.name);const source=await uploadAttachment(file,projectId);const row=await put(projectId,'resource',{category:'office-file',title:file.name,ext,source});working=false;notify('ファイルを読み込みました');await flush();onOpen(row.id);}catch(e){notify(e.message);}finally{working=false;upload.disabled=!canEdit();upload.value='';}
 };
 const listener=event=>{if(event!=='data'||disposed)return;drawFiles();syncFields();};state.listeners.push(listener);
 const beforeUnload=e=>{if(pending.size||working){e.preventDefault();e.returnValue='';}};window.addEventListener('beforeunload',beforeUnload);
 const session={flush};currentSession=session;drawFiles();if(item)openFile(item);
 return ()=>{disposed=true;loading++;for(const timer of timers.values())clearTimeout(timer);const i=state.listeners.indexOf(listener);if(i>=0)state.listeners.splice(i,1);window.removeEventListener('beforeunload',beforeUnload);if(currentSession===session)currentSession=null;};
}
