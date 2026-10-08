import {presentationCatalog} from './presentation-catalog.js?v=presentation-styles-1';

const presentationEscape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const presentationBooks=[
 {id:'layouts',name:'レイアウトフォーマット',file:'templates/presentation/layout-formats.pptx',download:'レイアウトフォーマット.pptx',pages:22,size:'8.4 MB',description:'システム説明12場面と、上司への報告・相談7場面。目的に合わせてスライドを複製できます。'},
 {id:'anime',name:'アニメ風コンポーネント',file:'templates/presentation/anime-components.pptx',download:'アニメ風コンポーネント.pptx',pages:33,size:'16.6 MB',description:'人物・施設・技術などのイラストと、矢印・ボタン・入力欄などの編集できる部品集。'},
 {id:'mini',name:'ミニキャラコンポーネント',file:'templates/presentation/mini-components.pptx',download:'ミニキャラコンポーネント.pptx',pages:33,size:'15.5 MB',description:'ミニキャラのイラストと、画面設計・業務フローの部品集。親しみのある説明資料に。'}
];
export const presentationStyles={anime:'アニメ風',mini:'ミニキャラ風',icon:'アイコン',real:'リアル'};
const componentCategories=['職業','技術','施設','計器','乗り物','通信','動物','矢印'];
const nativeParts=[
 {id:'arrows',name:'矢印',pages:[9,20],description:'左右上下・双方向・ステップ・折れ矢印・Uターン・循環・分岐など。'},
 {id:'issues',name:'課題の説明',pages:[15],description:'課題・原因・影響の枠と、説明文を配置する部品。'},
 {id:'flows',name:'フロー図',pages:[17],description:'受付から完了までの直線フロー、判断と分岐のフロー。'},
 {id:'buttons',name:'ボタン',pages:[16,26],description:'標準・アウトライン・削除・無効・読込中・アイコン付き・分割ボタンなど。'},
 {id:'choices',name:'トグル・チェック・選択',pages:[27],description:'トグル、チェック、ラジオ、スライダー、セグメント切替、評価。'},
 {id:'inputs',name:'入力欄',pages:[28],description:'通常・入力済み・フォーカス・エラー・無効・パスワード・検索・数値・複数行。'},
 {id:'dropdowns',name:'プルダウン・検索選択',pages:[29],description:'閉じた状態・展開・検索付き・複数選択・日付・時間選択。'},
 {id:'navigation',name:'タブ・ナビゲーション',pages:[30],description:'タブ、パンくず、ページ送り、ステップ表示、サイドメニュー、下部ナビ。'},
 {id:'status',name:'通知・バッジ・状態表示',pages:[31],description:'情報・成功・注意・エラーの通知、件数バッジ、タグ、進捗バー、トースト。'},
 {id:'cards',name:'カード・一覧・表',pages:[32],description:'情報カード、数値カード、リスト、テーブル。'},
 {id:'dialogs',name:'モーダル・補助部品',pages:[33],description:'確認モーダル、アコーディオン、ツールチップ、ファイルアップロード。'}
];
let presentationView={search:'',group:'all',category:'all',style:'anime',limit:24};
export function presentationMatches(tab,{search='',group='all',category='all',style='anime'}={}){
 const terms=search.trim().toLocaleLowerCase('ja').split(/\s+/).filter(Boolean);
 const matches=item=>terms.every(term=>[item.name,item.purpose,item.composition,item.description,item.category].filter(Boolean).join(' ').toLocaleLowerCase('ja').includes(term));
 if(tab==='components')return presentationCatalog.components.filter(item=>item.style===style&&(category==='all'||item.category===category)&&matches(item));
 return presentationCatalog.scenarios.filter(item=>(group==='all'||item.group===group)&&matches(item));
}
const presentationDownload=book=>`<a class="button primary" href="${book.file}" download="${book.download}">PowerPointをダウンロード</a>`;
export function presentationRoomHTML(){return `<section id="presentation-room" class="presentation-room"><div class="presentation-board"><div><span class="section-label">発表の準備室</span><h2>伝えたい場面から、資料を選ぼう。</h2><p>構図を決めて、部品を選んで、PowerPointで仕上げる。チームの説明資料づくりに使える道具をそろえました。</p></div><div class="presentation-board-numbers"><span><strong>19</strong>場面の配置</span><span><strong>${presentationCatalog.components.length}</strong>点のPNG部品</span><span><strong>3</strong>冊のPowerPoint</span></div></div><nav class="presentation-tabs" aria-label="プレゼン資料の棚"><button data-presentation-tab="layouts">📐 場面から選ぶ</button><button data-presentation-tab="components">🧩 コンポーネント</button><button data-presentation-tab="books">📚 資料の本棚</button></nav><div id="presentation-controls"></div><div id="presentation-results"></div><dialog id="presentation-detail" class="presentation-detail"></dialog></section>`;}
export function bindPresentationRoom({tab='layouts',item=null,onOpen,notify}){
 const root=document.querySelector('#presentation-room');if(!root)return ()=>{};
 const activeTab=['layouts','components','books'].includes(tab)?tab:'layouts';
 const controls=root.querySelector('#presentation-controls'),results=root.querySelector('#presentation-results'),modal=root.querySelector('#presentation-detail');
 const view=presentationView;
 const selectedStyle=Object.keys(presentationStyles).find(style=>item?.startsWith(style+'-'));if(selectedStyle&&!(item.includes('-native-')&&['icon','real'].includes(view.style)))view.style=selectedStyle;
 const bookForStyle=()=>presentationBooks.find(book=>book.id===view.style)||presentationBooks[1];
 root.querySelectorAll('[data-presentation-tab]').forEach(button=>{button.setAttribute('aria-current',button.dataset.presentationTab===activeTab?'page':'false');button.onclick=()=>onOpen(button.dataset.presentationTab,null);});
 function searchControl(){return `<label class="presentation-search">キーワードで探す<input id="presentation-search" type="search" placeholder="例：進捗、クラウド、工場" value="${presentationEscape(view.search)}"></label>`;}
 if(activeTab==='books'){
  controls.innerHTML='';results.innerHTML=`<div class="presentation-book-grid">${presentationBooks.map(book=>`<article class="presentation-book ${book.id}"><div class="presentation-book-cover">${book.id==='layouts'?'<img src="assets/presentation/layouts/cover.png" alt="レイアウトフォーマットの表紙" loading="lazy">':`<img src="${presentationCatalog.components.find(c=>c.style===book.id&&c.name==='エンジニア').image}" alt="${book.id==='anime'?'アニメ風':'ミニキャラ風'}の部品例" loading="lazy">`}</div><span class="tag">PPTX · ${book.pages}ページ · ${book.size}</span><h3>${book.name}</h3><p>${book.description}</p>${presentationDownload(book)}<button data-book-browse="${book.id}">${book.id==='layouts'?'場面から探す':'部品を見る'}</button></article>`).join('')}</div><section class="panel presentation-howto"><h3>資料の使い方</h3><ol><li>説明したい場面に合うレイアウトを選び、掲載ページを確認します。</li><li>PowerPointを開いて使いたいスライドを複製し、文字・図・矢印を差し替えます。</li><li>イラストはこの部屋からPNGで保存して挿入。ボタンなどの部品は部品集の掲載ページからコピーします。</li><li>氏名・日付・使い方の説明文を自分の発表用に整えます。</li></ol><p class="muted">元の資料をそのまま置いています。スライドの編集はPowerPointなど、PPTX対応アプリで行えます。</p></section>`;
  results.querySelectorAll('[data-book-browse]').forEach(button=>button.onclick=()=>{view.search='';if(button.dataset.bookBrowse==='layouts'){view.group='all';onOpen('layouts',null);}else{view.style=button.dataset.bookBrowse;view.category='all';view.limit=24;onOpen('components',null);}});
 }else{
  controls.innerHTML=`<div class="presentation-filters">${searchControl()}${activeTab==='layouts'?`<label>発表する場面<select id="presentation-group"><option value="all">すべての場面</option><option value="system">システム説明・導入提案</option><option value="report">上司への報告・相談</option></select></label>`:`<label>絵柄<select id="presentation-style">${Object.entries(presentationStyles).map(([value,label])=>`<option value="${value}">${label}</option>`).join('')}</select></label><label>分野<select id="presentation-category"><option value="all">すべての分野</option>${componentCategories.map(c=>`<option value="${c}">${c}</option>`).join('')}</select></label>`}</div>`;
  controls.querySelector('#presentation-search').oninput=event=>{view.search=event.target.value;view.limit=24;drawResults();};
  for(const key of ['group','style','category']){const select=controls.querySelector('#presentation-'+key);if(select){select.value=view[key];select.onchange=()=>{view[key]=select.value;view.limit=24;drawResults();};}}
  drawResults();
 }
 function drawResults(){
  const matches=presentationMatches(activeTab,view);
  if(activeTab==='layouts')results.innerHTML=`<p class="presentation-result-count" role="status">${matches.length}件のフォーマット</p><div class="presentation-layout-grid">${matches.map(layout=>`<button class="presentation-layout-card" data-layout="${layout.id}"><img src="${layout.image}" alt="${presentationEscape(layout.name)}の配置見本" loading="lazy"><div><span class="tag">${layout.group==='report'?'報告・相談':'説明・提案'} · ${layout.page}ページ</span><h3>${presentationEscape(layout.name)}</h3><p>${presentationEscape(layout.purpose)}</p><small>構図と使い方を見る →</small></div></button>`).join('')||'<p class="empty">該当する場面がありません。キーワードや場面を変えてください。</p>'}</div>`;
  else{
   const nativeMatches=nativeParts.filter(part=>(view.category==='all'||(view.category==='矢印'&&part.id==='arrows'))&&view.search.trim().toLocaleLowerCase('ja').split(/\s+/).filter(Boolean).every(term=>(part.name+' '+part.description).toLocaleLowerCase('ja').includes(term)));
   results.innerHTML=`<p class="presentation-result-count" role="status">${matches.length}点のPNG部品 · ${presentationStyles[view.style]}</p><div class="presentation-component-grid">${matches.slice(0,view.limit).map(component=>`<article class="presentation-component"><button class="presentation-component-image" data-component="${component.id}" aria-label="${presentationEscape(component.name)}の詳細"><img src="${component.image}" alt="${presentationEscape(component.name)}" loading="lazy"></button><strong>${presentationEscape(component.name)}</strong><small>${component.category}${component.page?' · '+component.page+'ページ':''}</small><a href="${component.image}" download="${presentationEscape(component.name)}-${component.style}.png">↓ PNGを保存</a></article>`).join('')||'<p class="empty">PNG部品はありません。矢印や画面部品は、下の掲載ページから選べます。</p>'}</div>${matches.length>view.limit?`<button class="presentation-more" id="presentation-more">さらに24点を見る（${Math.min(view.limit,matches.length)} / ${matches.length}）</button>`:''}${nativeMatches.length?`<section class="presentation-native"><div class="section-heading"><div><h3>PowerPointで編集できる部品</h3><p>文字・色・サイズを変えられます。部品集の掲載ページからコピーしてください。</p></div><span class="tag">${!['anime','mini'].includes(view.style)?'共通部品：':''}${bookForStyle().name}</span></div><div class="presentation-native-grid">${nativeMatches.map(part=>`<button data-native="${part.id}" class="presentation-native-card"><span class="tag">${part.pages.join('・')}ページ</span><strong>${part.name}</strong><p>${part.description}</p><small>使い方を見る →</small></button>`).join('')}</div></section>`:''}`;
   const more=results.querySelector('#presentation-more');if(more)more.onclick=()=>{const firstNew=matches[view.limit]?.id;view.limit+=24;drawResults();results.querySelector(`[data-component="${firstNew}"]`)?.focus({preventScroll:true});};
  }
  results.querySelectorAll('[data-layout]').forEach(button=>button.onclick=()=>onOpen('layouts',button.dataset.layout));
  results.querySelectorAll('[data-component]').forEach(button=>button.onclick=()=>onOpen('components',button.dataset.component));
  results.querySelectorAll('[data-native]').forEach(button=>button.onclick=()=>onOpen('components',`${bookForStyle().id}-native-${button.dataset.native}`));
 }
 function detail(title,body){modal.innerHTML=`<div class="dialog-head"><h2>${presentationEscape(title)}</h2><button type="button" data-presentation-close class="icon-button" aria-label="閉じる">×</button></div><div class="dialog-body">${body}</div><div class="dialog-footer"><button data-presentation-link>この部品・場面のURLをコピー</button><button data-presentation-close>閉じる</button></div>`;modal.querySelectorAll('[data-presentation-close]').forEach(button=>button.onclick=()=>modal.close());modal.querySelector('[data-presentation-link]').onclick=async()=>{try{await navigator.clipboard.writeText(location.href);notify('選択した資料のURLをコピーしました。');}catch{notify('URLをコピーできませんでした。ブラウザのアドレス欄からコピーしてください。');}};modal.onclose=()=>{if(root.isConnected)onOpen(activeTab,null);};modal.showModal();}
 if(item){
  const layout=presentationCatalog.scenarios.find(l=>l.id===item),component=presentationCatalog.components.find(c=>c.id===item);
  const nativeStyle=item.startsWith('mini-native-')?'mini':'anime';const part=nativeParts.find(p=>item===nativeStyle+'-native-'+p.id);
  if(layout)detail(layout.name,`<img class="presentation-detail-layout" src="${layout.image}" alt="${presentationEscape(layout.name)}の配置見本"><dl class="presentation-guidance"><dt>こんな場面に</dt><dd>${presentationEscape(layout.purpose)}</dd><dt>配置のポイント</dt><dd>${presentationEscape(layout.composition)}</dd><dt>伝わること</dt><dd>${presentationEscape(layout.effect)}</dd></dl><p><strong>レイアウトフォーマットの${layout.page}ページ</strong>を複製して使います。</p>${presentationDownload(presentationBooks[0])}`);
  else if(component)detail(component.name,`<div class="presentation-detail-component"><img src="${component.image}" alt="${presentationEscape(component.name)}"></div><p>${presentationStyles[component.style]} · ${component.category}${component.page?' · 部品集の'+component.page+'ページ':''}</p><p>${component.style==='real'?'写真風のAI生成素材です。':''}PNGを保存してPowerPointに挿入できます。大きさを変えるときは縦横比を保ってください。</p><a class="button primary" href="${component.image}" download="${presentationEscape(component.name)}-${component.style}.png">PNGを保存</a> ${presentationBooks.some(book=>book.id===component.style)?presentationDownload(presentationBooks.find(book=>book.id===component.style)):''}`);
  else if(part){const book=presentationBooks.find(book=>book.id===nativeStyle);detail(part.name,`<span class="tag">PowerPointの編集可能な部品</span><p>${part.description}</p><p><strong>${book.name}の${part.pages.join('・')}ページ</strong>に掲載されています。</p><ol><li>部品集をPowerPointで開き、掲載ページへ進みます。</li><li>使いたい部品を選択してコピーし、自分のスライドに貼り付けます。</li><li>文字・色・サイズを変更して使います。</li></ol>${presentationDownload(book)}`);}
  else notify('この資料は見つかりません。棚から選び直してください。');
 }
 return ()=>{modal.onclose=null;if(modal.open)modal.close();};
}
