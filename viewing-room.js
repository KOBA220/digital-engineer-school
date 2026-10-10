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
export function viewingRoomHTML(){return `<section class="panel viewing-room"><div class="section-heading"><div><span class="section-label">SCREENING ROOM</span><h2>映像ルーム</h2></div><button data-view-settings ${canEdit()?'':'disabled'}>環境URLを設定</button></div><p>本番の画面と、開発中のデモ画面を切り替えて確認できます。</p><div class="view-environments" role="group" aria-label="表示する環境"><button data-view-env="production">本番環境</button><button data-view-env="demo" class="primary">デモ環境</button></div><div class="view-controls"><label>デモの表示元<select id="view-source"><option value="draft">開発部屋の保存済み下書き</option><option value="url">デモ環境の公開URL</option></select></label><label id="view-entry-label">表示するHTML<select id="view-entry"></select></label><button data-view-refresh>更新して表示</button><a id="view-external" target="_blank" rel="noopener noreferrer" hidden>別タブで開く ↗</a></div><p id="view-status" role="status" aria-live="polite"></p><iframe id="view-screen" title="開発後の画面プレビュー" sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads" referrerpolicy="no-referrer" hidden></iframe><div id="view-empty" class="empty"></div><p class="muted">下書きはHTML・通常のJavaScript・CSSに対応。保存された変更を反映します。React・Node.jsなどはビルド・起動したデモ環境のURLを登録してください。URL登録は表示先の設定です。デプロイや本番への反映は開発環境から行います。埋め込みを許可しないサイトやログインが必要な画面は「別タブで開く」から確認できます。</p></section>`;}
export function bindViewingRoom({projectId,dialog,notify}){
 const root=document.querySelector('.viewing-room');if(!root)return ()=>{};
 const $=selector=>root.querySelector(selector);let environment='demo',disposed=false;
 const refresh=()=>{
  if(disposed)return;const drafts=list('code',projectId),entry=$('#view-entry'),previous=entry.value;
  entry.innerHTML=drafts.filter(row=>/\.html?$/i.test(row.payload.path)).map(row=>`<option value="${esc(row.payload.path)}">${esc(row.payload.path)}</option>`).join('');
  if([...entry.options].some(option=>option.value===previous))entry.value=previous;
  else if([...entry.options].some(option=>option.value==='index.html'))entry.value='index.html';
  const source=environment==='production'?'url':$('#view-source').value;
  $('#view-source').closest('label').hidden=environment==='production';$('#view-entry-label').hidden=source!=='draft';
  root.querySelectorAll('[data-view-env]').forEach(button=>{const active=button.dataset.viewEnv===environment;button.classList.toggle('primary',active);button.setAttribute('aria-pressed',String(active));});
  const frame=$('#view-screen'),external=$('#view-external'),empty=$('#view-empty'),status=$('#view-status');
  frame.hidden=true;frame.removeAttribute('src');frame.removeAttribute('srcdoc');external.hidden=true;empty.hidden=false;
  try{
   if(source==='draft'){
    if(!entry.value){status.textContent='デモ環境 · 下書きプレビュー';empty.textContent='開発部屋でindex.htmlなどのHTMLファイルを追加して保存すると、ここに変更後の画面が表示されます。';return;}
    frame.srcdoc=buildDraftPreview(drafts,entry.value);status.textContent=`デモ環境 · 下書き ${entry.value} · 保存済みの変更を反映`;
   }else{
    const url=environmentURL(setting(projectId)?.payload[environment+'Url']);
    status.textContent=environment==='production'?'本番環境 · 公開画面':'デモ環境 · 公開画面';
    if(!url){empty.textContent='「環境URLを設定」で'+(environment==='production'?'本番':'デモ')+'環境の公開URLを登録してください。';return;}
    frame.src=url;external.href=url;external.hidden=false;status.textContent+=' · '+url+' · 埋め込み不可の場合は別タブで開いてください。';
   }
   frame.hidden=false;empty.hidden=true;
  }catch(error){status.textContent='表示できません';empty.textContent=error.message;}
 };
 root.querySelectorAll('[data-view-env]').forEach(button=>button.onclick=()=>{environment=button.dataset.viewEnv;refresh();});
 $('#view-source').onchange=refresh;$('#view-entry').onchange=refresh;$('[data-view-refresh]').onclick=refresh;
 $('[data-view-settings]').onclick=()=>{const row=setting(projectId),payload=row?.payload||{};dialog('本番・デモ環境の表示先',`<p>プロジェクトごとに公開URLを登録します。デモは本番とは別のデプロイ先を指定してください。</p><label>本番環境URL<input name="productionUrl" type="url" placeholder="https://example.com" value="${esc(payload.productionUrl)}"></label><label>デモ環境URL<input name="demoUrl" type="url" placeholder="https://demo.example.com" value="${esc(payload.demoUrl)}"></label>`,async form=>{const productionUrl=environmentURL(form.get('productionUrl')),demoUrl=environmentURL(form.get('demoUrl'));if(productionUrl&&productionUrl===demoUrl)throw Error('本番とデモには別のURLを指定してください。');await put(projectId,'resource',{category:'viewing-environments',productionUrl,demoUrl},row?.id,row?.version);notify('環境の表示先を保存しました');});};
 const listener=event=>{if(event==='data')refresh();};state.listeners.push(listener);refresh();
 return ()=>{disposed=true;const i=state.listeners.indexOf(listener);if(i>=0)state.listeners.splice(i,1);$('#view-screen')?.remove();};
}
