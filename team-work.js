import {state,list,put,remove,canEdit} from './store.js';

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const officeTypes={powerpoint:'PowerPoint',excel:'Excel',word:'Word'};
export function officeURL(value){
 try{const u=new URL(String(value).trim());const h=u.hostname.toLowerCase();
  if(u.protocol!=='https:'||u.username||u.password||u.port)return '';
  if(!['1drv.ms','onedrive.live.com','office.live.com'].includes(h)&&!h.endsWith('.sharepoint.com'))return '';
  if(u.pathname==='/')return '';
  return u.href;
 }catch{return '';}
}
export const teamRules=projectId=>list('resource',projectId).filter(e=>e.payload.category==='team-rule');
export const officeDocuments=projectId=>list('resource',projectId).filter(e=>e.payload.category==='shared-office');
export function rulesHTML(projectId,{layout='home'}={}){
 const rules=projectId?teamRules(projectId):[];
 const actions=e=>canEdit()?`<div class="row rule-actions"><button class="quiet" data-team-rule-edit="${e.id}">編集</button><button class="quiet" data-team-rule-delete="${e.id}">削除</button></div>`:'';
 const add=`<button class="text-button" data-team-rule-new ${projectId&&canEdit()?'':'disabled'}>＋ 約束・ルールを追加</button>`;
 if(layout==='dev')return `<section class="noticeboard team-rules"><span class="section-label">開発ルール掲示板</span><h2>教室の約束</h2><ol class="rules"><li>開始前に最新の変更を取得</li><li>作業ごとにブランチを作る</li><li>一日の最後にcommit &amp; push</li><li>mainへはPRとレビューで反映</li><li>秘密情報はコードに書かない</li><li>完了条件と結果をタスクに残す</li>${rules.map(e=>`<li><strong>${esc(e.payload.title)}</strong>${e.payload.content?`<p class="rule-content">${esc(e.payload.content)}</p>`:''}${actions(e)}</li>`).join('')}</ol>${add}</section>`;
 return `<section class="noticeboard team-rules"><span class="section-label">校内掲示板</span><h2>チームの約束</h2><div class="paper yellow-paper"><span class="pin"></span><strong>一日の最後はcommit &amp; push</strong><p>作業の続きが、明日の自分と仲間に伝わるように。</p></div><div class="paper"><span class="pin"></span><strong>小さく作って、早く共有</strong><p>困ったことはタスクに残して、教室で相談しよう。</p></div>${rules.map((e,i)=>`<div class="paper ${i%2===0?'yellow-paper':''}"><span class="pin"></span><strong>${esc(e.payload.title)}</strong>${e.payload.content?`<p class="rule-content">${esc(e.payload.content)}</p>`:''}${actions(e)}</div>`).join('')}<div class="row wrap">${add}<button class="text-button" data-action="openRules">開発ルールを読む</button></div></section>`;
}
export function officeHTML(projectId){
 const docs=projectId?officeDocuments(projectId):[];
 return `<section class="panel shared-office"><div class="section-heading"><div><span class="section-label">チームで使う資料</span><h2>Office共同編集</h2></div><button data-office-new ${projectId&&canEdit()?'':'disabled'}>＋ 共同編集する資料を登録</button></div><p>同じPowerPoint・Excel・Wordを開いて、一緒に編集できます。</p><div class="shared-office-grid">${docs.map(e=>{const p=e.payload,url=officeURL(p.url);return `<article class="shared-office-card"><span class="tag">${esc(officeTypes[p.officeType]||'Office')}</span><h3>${esc(p.title)}</h3><p style="white-space:pre-wrap">${esc(p.description)}</p><div class="row wrap">${url?`<a class="button primary" href="${esc(url)}" target="_blank" rel="noopener noreferrer">共同編集画面を開く ↗</a><button data-office-copy="${e.id}">リンクをコピー</button>`:'<span>共有URLを確認してください</span>'}${canEdit()?`<button data-office-edit="${e.id}">登録内容を編集</button><button data-office-delete="${e.id}" class="quiet">登録を削除</button>`:''}</div></article>`;}).join('')||'<p class="empty">まだ共同編集の資料がありません。共有リンクを登録してください。</p>'}</div><details class="office-help"><summary>共同編集を始める手順</summary><ol><li>編集する.pptx・.xlsx・.docxファイルをOneDriveまたはSharePointに保存します。</li><li>共有設定で共同開発者に「編集可能」の権限を付け、共有リンクをコピーします。</li><li>この部屋でタイトル・種類・共有リンクを登録します。</li><li>全員が同じ資料の「共同編集画面を開く」を押し、Officeの画面で編集します。</li></ol><p>共同編集画面は別タブで開きます。資料の中身はMicrosoft側で自動保存・同期されます。学校の添付ファイルやダウンロード済みのコピーには変更が反映されません。</p><p>学校のメンバー権限とは別に、Microsoft側でも閲覧・編集権限を設定してください。閲覧専用メンバーがいる場合は、Microsoft側にも閲覧権限で共有します。</p><p>プレゼンルームのテンプレートはダウンロードしてからOneDriveに保存すると、一緒に編集できます。</p></details>${state.preview?'<p class="muted">体験モードでは登録情報はこの端末だけに保存されます。</p>':''}</section>`;
}
export function bindTeamWork({projectId,dialog,notify}){
 if(!projectId)return;
 const find=(id,category)=>list('resource',projectId).find(e=>e.id===id&&e.payload.category===category);
 const editRule=entity=>{
  if(!canEdit())return;const p=entity?.payload||{};
  dialog(entity?'約束・ルールを編集':'約束・ルールを追加',`<label>タイトル<input name="title" required maxlength="200" value="${esc(p.title)}"></label><label>内容（任意）<textarea name="content" rows="5" maxlength="10000">${esc(p.content)}</textarea></label>`,async f=>{
   const title=f.get('title').trim();if(!title)throw Error('タイトルを入力してください');
   await put(projectId,'resource',{...p,category:'team-rule',title,content:f.get('content').trim()},entity?.id,entity?.version);notify('約束・ルールを保存しました');
  });
 };
 const editOffice=entity=>{
  if(!canEdit())return;const p=entity?.payload||{};
  dialog(entity?'共同編集資料の登録内容を編集':'共同編集する資料を登録',`<label>タイトル<input name="title" required maxlength="200" value="${esc(p.title)}"></label><label>種類<select name="officeType">${Object.entries(officeTypes).map(([key,name])=>`<option value="${key}" ${p.officeType===key?'selected':''}>${name}</option>`).join('')}</select></label><label>OneDrive / SharePointの共有リンク<input name="url" type="url" required value="${esc(p.url)}" placeholder="https://1drv.ms/..."></label><label>説明（任意）<textarea name="description" rows="3" maxlength="2000">${esc(p.description)}</textarea></label><p>共同開発者に「編集可能」で共有したリンクを登録してください。Officeの共同編集画面は別タブで開きます。</p>`,async f=>{
   const title=f.get('title').trim(),url=officeURL(f.get('url'));if(!title)throw Error('タイトルを入力してください');if(!url)throw Error('OneDriveまたはSharePointのHTTPS共有リンクを入力してください');
   await put(projectId,'resource',{...p,category:'shared-office',title,url,officeType:f.get('officeType'),description:f.get('description').trim()},entity?.id,entity?.version);notify('共同編集資料のリンクを保存しました');
  });
 };
 document.querySelectorAll('[data-team-rule-new]').forEach(b=>b.onclick=()=>editRule());
 document.querySelectorAll('[data-team-rule-edit]').forEach(b=>b.onclick=()=>{const e=find(b.dataset.teamRuleEdit,'team-rule');if(e)editRule(e);});
 document.querySelectorAll('[data-office-new]').forEach(b=>b.onclick=()=>editOffice());
 document.querySelectorAll('[data-office-edit]').forEach(b=>b.onclick=()=>{const e=find(b.dataset.officeEdit,'shared-office');if(e)editOffice(e);});
 for(const [attribute,category] of [['team-rule','team-rule'],['office','shared-office']])document.querySelectorAll(`[data-${attribute}-delete]`).forEach(b=>b.onclick=()=>{
  const e=find(b.getAttribute(`data-${attribute}-delete`),category);if(!e||!canEdit())return;
  dialog(category==='team-rule'?'約束・ルールを削除':'資料の登録を削除',`<p>「${esc(e.payload.title)}」を${category==='team-rule'?'削除':'この学校の一覧から削除'}します。</p>${category==='shared-office'?'<p>OneDrive・SharePointのファイルは残ります。</p>':''}`,async()=>{await remove(e);notify('削除しました');},'削除');
 });
 document.querySelectorAll('[data-office-copy]').forEach(b=>b.onclick=async()=>{const e=find(b.dataset.officeCopy,'shared-office'),url=officeURL(e?.payload.url);if(!url)return;try{await navigator.clipboard.writeText(url);notify('共同編集リンクをコピーしました');}catch{notify('リンクをコピーできませんでした。共同編集画面から共有してください。');}});
}
