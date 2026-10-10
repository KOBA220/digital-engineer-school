import {state,list,put,canEdit} from './store.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function environmentURL(value){
 if(!String(value||'').trim())return '';
 let url;try{url=new URL(String(value).trim());}catch{throw Error('https:// から始まる公開URLを入力してください。');}
 if(url.protocol!=='https:' || url.username || url.password)throw Error('認証情報を含まないHTTPSの公開URLを入力してください。');
 return url.href;
}
export function buildDraftPreview(drafts,entry){
 const files=new Map();
 for(const row of drafts){const path=String(row.payload.path||'').replace(/^\.\//,'');if(files.has(path))throw Error('同じパスの下書きが複数あります。開発部屋で整理してください。');files.set(path,String(row.payload.code||''));}
 if(!files.has(entry))throw Error('表示するHTMLファイルを選択してください。');
 const doc=new DOMParser().parseFromString(files.get(entry),'text/html');
 const resolve=value=>{try{return new URL(value,new URL(entry,'https://draft.invalid/')).pathname.slice(1);}catch{return '';}};
 const missing=[];
 doc.querySelectorAll('base').forEach(node=>node.remove());
 doc.querySelectorAll('link[rel="stylesheet"]').forEach(node=>{const href=node.getAttribute('href');if(!href||/^(https?:|\/\/|data:)/i.test(href))return;const path=resolve(href);if(!files.has(path)){missing.push(path);return;}const style=doc.createElement('style');style.textContent=files.get(path);node.replaceWith(style);});
 doc.querySelectorAll('script[src]').forEach(node=>{const src=node.getAttribute('src');if(!src||/^(https?:|\/\/|data:)/i.test(src))return;const path=resolve(src);if(!files.has(path)){missing.push(path);return;}node.removeAttribute('src');node.textContent=files.get(path);});
 if(missing.length)throw Error('参照ファイルの下書きがありません：'+missing.join('、'));
 if([...doc.querySelectorAll('script')].some(node=>node.type==='module'))throw Error('モジュール形式のアプリはビルドしたデモ環境のURLを登録して確認してください。');
 // Keep raw text from ending its containing tag when serialized into srcdoc.
 doc.querySelectorAll('script').forEach(node=>{node.textContent=node.textContent.replace(/<\/script/gi,'<\\/script');});
 doc.querySelectorAll('style').forEach(node=>{node.textContent=node.textContent.replace(/<\/style/gi,'<\\/style');});
 const policy=doc.createElement('meta');policy.httpEquiv='Content-Security-Policy';policy.content="default-src https: data: blob:; script-src https: 'unsafe-inline'; style-src https: 'unsafe-inline'; img-src https: data: blob:; base-uri 'none'; form-action 'none'; connect-src 'none'";doc.head.prepend(policy);
 return '<!doctype html>\n'+doc.documentElement.outerHTML;
}
const setting=projectId=>list('resource',projectId).find(row=>row.payload.category==='viewing-environments');
export function viewingEnvironments(payload={}){
 const defaults=[{id:'production',name:'本番環境',url:payload.productionUrl||''},{id:'demo',name:'デモ環境',url:payload.demoUrl||''}];
 return defaults.map(env=>({...env,...payload.environments?.find(item=>item.id===env.id)})).concat((payload.environments||[]).filter(env=>!['production','demo'].includes(env.id)));
}
export async function readPreviewFiles(files){
 const selected=Array.from(files||[]);if(!selected.length)throw Error('ファイルを選択してください。');
 if(selected.reduce((sum,file)=>sum+file.size,0)>2*1024*1024)throw Error('合計2MBまで読み込めます。');
 if(selected.some(file=>!/\.(html?|css|js)$/i.test(file.name)))throw Error('HTML・CSS・JavaScriptファイルを選択してください。');
 const rows=await Promise.all(selected.map(async file=>({payload:{path:file.webkitRelativePath||file.name,code:await file.text()}})));
 const entry=rows.find(row=>/\.html?$/i.test(row.payload.path))?.payload.path;if(!entry)throw Error('HTMLファイルも選択してください。');
 buildDraftPreview(rows,entry);return {files:rows.map(row=>row.payload),entry};
}
export function viewingRoomHTML(){return `<section class="panel viewing-room"><div class="section-heading"><div><span class="section-label">SCREENING ROOM</span><h2>映像ルーム</h2></div><div><button data-view-add ${canEdit()?'':'disabled'}>＋ 環境を追加</button> <button data-view-settings ${canEdit()?'':'disabled'}>環境を設定</button></div></div><p>環境を切り替えて、公開画面やHTMLファイルを確認できます。</p><div class="view-environments" role="group" aria-label="表示する環境"></div><div class="view-controls"><label>表示元<select id="view-source"><option value="draft">開発部屋の保存済み下書き</option><option value="url">環境の公開URL</option><option value="file">読み込んだHTMLファイル</option></select></label><label id="view-entry-label">表示するHTML<select id="view-entry"></select></label><label id="view-upload-label" hidden>HTMLを読み込む（CSS・JSも同時選択可）<input id="view-upload" type="file" accept=".html,.htm,.css,.js" multiple ${canEdit()?'':'disabled'}></label><button data-view-refresh>更新して表示</button><a id="view-external" target="_blank" rel="noopener noreferrer" hidden>別タブで開く ↗</a></div><p id="view-status" role="status" aria-live="polite"></p><iframe id="view-screen" title="開発後の画面プレビュー" sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads" referrerpolicy="no-referrer" hidden></iframe><div id="view-empty" class="empty"></div><p class="muted">HTML・通常のJavaScript・CSSに対応（合計2MBまで）。読み込んだファイルは環境ごとにプロジェクトへ保存され、メンバーも確認できます。外部CSS・JSが必要な場合は同時に選択してください。React・Node.jsなどはビルド・起動した環境URLを登録してください。埋め込み不可のサイトは別タブで確認できます。</p></section>`;}
export function bindViewingRoom({projectId,dialog,notify}){
 const root=document.querySelector('.viewing-room');if(!root)return ()=>{};
 const $=selector=>root.querySelector(selector);let environment='demo',disposed=false;const sources=new Map([['demo','draft']]);
 const environments=()=>viewingEnvironments(setting(projectId)?.payload);
 const save=async items=>{const row=setting(projectId);await put(projectId,'resource',{...row?.payload,category:'viewing-environments',environments:items},row?.id,row?.version);};
 const refresh=()=>{
  if(disposed)return;const envs=environments();if(!envs.some(env=>env.id===environment))environment='demo';const env=envs.find(env=>env.id===environment);
  $('.view-environments').innerHTML=envs.map(item=>`<button data-view-env="${esc(item.id)}" class="${item.id===environment?'primary':''}" aria-pressed="${item.id===environment}">${esc(item.name)}</button>`).join('');
  root.querySelectorAll('[data-view-env]').forEach(button=>button.onclick=()=>{environment=button.dataset.viewEnv;refresh();});
  const source=sources.get(environment)||(env.preview?'file':'url');$('#view-source').value=source;
  const drafts=source==='file'?(env.preview?.files||[]).map(payload=>({payload})):list('code',projectId),entry=$('#view-entry'),previous=entry.value;
  entry.innerHTML=drafts.filter(row=>/\.html?$/i.test(row.payload.path)).map(row=>`<option value="${esc(row.payload.path)}">${esc(row.payload.path)}</option>`).join('');
  if([...entry.options].some(option=>option.value===previous))entry.value=previous;else if(env.preview?.entry&&source==='file')entry.value=env.preview.entry;else if([...entry.options].some(option=>option.value==='index.html'))entry.value='index.html';
  $('#view-entry-label').hidden=source==='url';$('#view-upload-label').hidden=source!=='file';
  const frame=$('#view-screen'),external=$('#view-external'),empty=$('#view-empty'),status=$('#view-status');
  frame.hidden=true;frame.removeAttribute('src');frame.removeAttribute('srcdoc');external.hidden=true;empty.hidden=false;
  try{
   if(source!=='url'){
    status.textContent=env.name+' · '+(source==='file'?'HTMLファイル':'下書きプレビュー');
    if(!entry.value){empty.textContent=source==='file'?'HTMLファイルを選択して読み込んでください。':'開発部屋でHTMLファイルを追加して保存してください。';return;}
    frame.srcdoc=buildDraftPreview(drafts,entry.value);status.textContent+=' · '+entry.value+' · 保存済みの変更を反映';
   }else{
    const url=environmentURL(env.url);status.textContent=env.name+' · 公開画面';
    if(!url){empty.textContent='「環境を設定」で公開URLを登録するか、表示元をHTMLファイルに切り替えてください。';return;}
    frame.src=url;external.href=url;external.hidden=false;status.textContent+=' · '+url;
   }
   frame.hidden=false;empty.hidden=true;
  }catch(error){status.textContent='表示できません';empty.textContent=error.message;}
 };
 $('#view-source').onchange=()=>{sources.set(environment,$('#view-source').value);refresh();};$('#view-entry').onchange=refresh;$('[data-view-refresh]').onclick=refresh;
 const configure=adding=>{
  if(!canEdit())return;const selectedId=environment,env=adding?{name:'',url:''}:environments().find(item=>item.id===selectedId);
  dialog(adding?'環境を追加':'環境を設定',`<label>環境名<input name="name" required maxlength="60" placeholder="検証環境・スマホ版など" value="${esc(env.name)}"></label><label>公開URL（HTMLを使う場合は空欄可）<input name="url" type="url" placeholder="https://example.com" value="${esc(env.url)}"></label>`,async form=>{
   const name=String(form.get('name')||'').trim();if(!name)throw Error('環境名を入力してください。');
   const id=adding?crypto.randomUUID():selectedId,items=environments(),url=environmentURL(form.get('url'));
   if(items.some(item=>item.id!==id&&item.name===name))throw Error('別の環境名を入力してください。');
   if(adding)items.push({id,name,url});else Object.assign(items.find(item=>item.id===id),{name,url});
   await save(items);environment=id;sources.set(id,url?'url':'file');refresh();notify(adding?'環境を追加しました':'環境を保存しました');
  });
 };
 $('[data-view-add]').onclick=()=>configure(true);$('[data-view-settings]').onclick=()=>configure(false);
 $('#view-upload').onchange=async event=>{
  if(!canEdit())return;const selectedId=environment,files=Array.from(event.target.files);if(!files.length)return;
  event.target.disabled=true;
  try{const preview=await readPreviewFiles(files),items=environments(),env=items.find(item=>item.id===selectedId);if(!env)throw Error('環境が見つかりません。');env.preview=preview;await save(items);sources.set(selectedId,'file');refresh();notify('HTMLファイルを保存しました');}
  catch(error){notify(error.message);}
  finally{event.target.disabled=!canEdit();event.target.value='';}
 };
 const listener=event=>{if(event==='data')refresh();};state.listeners.push(listener);refresh();
 return ()=>{disposed=true;const i=state.listeners.indexOf(listener);if(i>=0)state.listeners.splice(i,1);$('#view-screen')?.remove();};
}
