import {state,list,put,canEdit} from './store.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const setting=pid=>list('resource',pid).find(row=>row.payload.category==='onlyoffice-connection');
export function officeConnectionURL(value){
 if(!String(value||'').trim())return '';let url;try{url=new URL(String(value).trim());}catch{throw Error('HTTPSの接続先URLを入力してください');}
 if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||!['','/'].includes(url.pathname))throw Error('https://PCのアドレス:8443 の形式で入力してください');return url.origin;
}
export const officeConnection=pid=>officeConnectionURL(setting(pid)?.payload.url);
export function configureOfficeConnection({projectId,dialog,notify}){
 const row=setting(projectId);dialog('ONLYOFFICE接続',`<p>手元のPCで起動したONLYOFFICEに接続します。メンバー全員から届く同じURLを登録してください。</p><label>接続先URL<input name="url" type="url" placeholder="https://192.168.1.10:8443" value="${esc(row?.payload.url)}"></label><p>初回はPCのセットアップと証明書の登録が必要です。</p><a href="https://github.com/KOBA220/digital-engineer-school/blob/main/local-office/README.md" target="_blank" rel="noopener noreferrer">PC側の無料セットアップ手順 ↗</a><p class="muted">空欄で保存すると接続を解除します。ONLYOFFICEで編集を始めたファイルは、レイアウト編集から開いてください。</p>`,async form=>{await put(projectId,'resource',{category:'onlyoffice-connection',url:officeConnectionURL(form.get('url'))},row?.id,row?.version);notify('ONLYOFFICEの接続先を保存しました');});
}
async function request(base,path,body){
 if(state.preview||!state.client)throw Error('ONLYOFFICEはログイン後のプロジェクトで利用できます');
 const {data,error}=await state.client.auth.getSession();if(error||!data.session?.access_token)throw Error('ログインし直してください');
 let response;try{response=await fetch(base+path,{method:'POST',headers:{Authorization:'Bearer '+data.session.access_token,'Content-Type':body instanceof Uint8Array?'application/octet-stream':'application/json'},body:body instanceof Uint8Array?body:JSON.stringify(body),signal:AbortSignal.timeout(90000)});}catch{throw Error('PCへ接続できません。PCの起動・接続先・証明書・ネットワークを確認してください');}
 const result=await response.json();if(!response.ok)throw Error(result.error||'ONLYOFFICEに接続できません');return result;
}
const scripts=new Map();
async function loadAPI(url){
 if(scripts.has(url))return scripts.get(url);
 const promise=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=url;const timer=setTimeout(()=>{script.remove();reject(Error('ONLYOFFICEの起動または証明書を確認してください'));},30000);script.onload=()=>{clearTimeout(timer);resolve();};script.onerror=()=>{clearTimeout(timer);script.remove();reject(Error('ONLYOFFICEの画面を読み込めません。接続先を別タブで開いて確認してください'));};document.head.append(script);});
 scripts.set(url,promise);try{await promise;}catch(error){scripts.delete(url);throw error;}
}
export async function mountOnlyOffice({projectId,row,container,initialBytes,notify,isDisposed=()=>false}){
 const base=officeConnection(projectId);if(!base)throw Error('「ONLYOFFICE接続」でPCの接続先を設定してください');
 const result=await request(base,`/api/session?project=${encodeURIComponent(projectId)}&document=${encodeURIComponent(row.id)}`,initialBytes||new Uint8Array());
 // The bridge returns signed configuration; only load scripts from the selected PC.
 if(result.apiUrl!==base+'/web-apps/apps/api/documents/api.js')throw Error('ONLYOFFICEの接続先が一致しません');
 if(isDisposed())return ()=>{};await loadAPI(result.apiUrl);if(isDisposed())return ()=>{};
 if(!window.DocsAPI?.DocEditor)throw Error('ONLYOFFICEの画面を読み込めません');
 container.innerHTML='<div id="onlyoffice-document"></div>';let changed=false;
 const editor=new window.DocsAPI.DocEditor('onlyoffice-document',{...result.config,events:{onDocumentStateChange:event=>{changed=!!event.data;},onError:event=>notify('ONLYOFFICE：'+(event.data?.errorDescription||'編集画面でエラーが発生しました'))}});
 const status=document.querySelector('#onlyoffice-save-status');
 const ping=async()=>{const saved=await request(base,'/api/keepalive',{key:result.key});if(status)status.textContent=saved.savedAt?'プロジェクトに保存済み · '+new Date(saved.savedAt).toLocaleTimeString('ja-JP'):'共同編集中 · 保存ボタンまたは終了時にプロジェクトへ保存';return saved;};
 const keepalive=()=>ping().catch(error=>{if(status)status.textContent='保存待ち · '+error.message;});
 const timer=setInterval(keepalive,120000);
 const unload=event=>{if(changed){event.preventDefault();event.returnValue='';}};window.addEventListener('beforeunload',unload);
 const cleanup=()=>{clearInterval(timer);window.removeEventListener('beforeunload',unload);editor.destroyEditor();};
 cleanup.flush=async()=>{
  if(status)status.textContent='プロジェクトへ保存しています…';
  const saved=await request(base,'/api/force-save',{key:result.key});
  if(saved.wait){const until=Date.now()+15000;let done=false;while(Date.now()<until){const current=await ping();if(current.lastSave&&current.lastSave!==saved.marker&&!current.pending){done=true;break;}await new Promise(resolve=>setTimeout(resolve,350));}if(!done)throw Error('保存完了を確認できません。PCを起動したまま「プロジェクトに保存」を再試行してください');}
  else await ping();
 };return cleanup;
}
