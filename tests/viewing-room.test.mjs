import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {state,emit} from '../store.js';
import {environmentURL,buildDraftPreview,viewingRoomHTML,bindViewingRoom,viewingEnvironments,readPreviewFiles} from '../viewing-room.js';
const dom=new JSDOM('<body></body>',{url:'https://school.test/'});
globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.DOMParser=dom.window.DOMParser;
const code=(path,content,project='p')=>({id:path,project_id:project,kind:'code',payload:{path,code:content}});
test('public environment URLs reject executable schemes and embedded credentials',()=>{
 assert.equal(environmentURL(' https://demo.test/app '),'https://demo.test/app');assert.equal(environmentURL(''),'');
 for(const url of ['javascript:alert(1)','http://demo.test','https://user:password@demo.test','data:text/html,test'])assert.throws(()=>environmentURL(url));
});
test('saved static draft resolves sibling CSS and JS and stays in isolated frame',()=>{
 const preview=buildDraftPreview([code('pages/index.html','<link rel="stylesheet" href="../style.css"><h1>変更後</h1><script src="../main.js"></script>'),code('style.css','h1{color:red}'),code('main.js','document.querySelector("h1").textContent="更新";')],'pages/index.html');
 assert.match(preview,/h1\{color:red\}/);assert.match(preview,/textContent="更新"/);assert.match(preview,/connect-src 'none'/);assert.doesNotMatch(preview,/src="\.\.\/main.js"/);
 assert.throws(()=>buildDraftPreview([code('index.html','<script src="missing.js"></script>')],'index.html'),/下書きがありません/);
 assert.throws(()=>buildDraftPreview([code('index.html','<script type="module">import x from "x"</script>')],'index.html'),/ビルド/);
});
test('environment switch isolates draft from production and updates saved changes only for current project',()=>{
 state.role='editor';state.entities=[code('index.html','<h1>初期画面</h1>'),code('index.html','<h1>別プロジェクト</h1>','other'),{id:'settings',project_id:'p',kind:'resource',payload:{category:'viewing-environments',productionUrl:'https://production.test',demoUrl:'https://demo.test'}}];
 document.body.innerHTML=viewingRoomHTML();const before=state.listeners.length;
 const dispose=bindViewingRoom({projectId:'p',dialog:()=>{},notify:()=>{}});
 const frame=document.querySelector('#view-screen');assert.match(frame.srcdoc,/初期画面/);assert.doesNotMatch(frame.srcdoc,/別プロジェクト/);assert.doesNotMatch(frame.getAttribute('sandbox'),/allow-same-origin/);
 state.entities[0].payload.code='<h1>保存後の変更</h1>';emit();assert.match(frame.srcdoc,/保存後の変更/);
 document.querySelector('[data-view-env="production"]').click();assert.equal(frame.src,'https://production.test/');assert.equal(frame.hasAttribute('srcdoc'),false);
 document.querySelector('[data-view-env="demo"]').click();assert.match(frame.srcdoc,/保存後の変更/);
 const source=document.querySelector('#view-source');source.value='url';source.dispatchEvent(new window.Event('change'));assert.equal(frame.src,'https://demo.test/');
 dispose();assert.equal(state.listeners.length,before);assert.equal(document.querySelector('#view-screen'),null);
});
test('viewers cannot change environment settings',()=>{state.role='viewer';document.body.innerHTML=viewingRoomHTML();assert.equal(document.querySelector('[data-view-settings]').disabled,true);});

test('custom environments preserve legacy URLs and show project HTML bundles',()=>{
 const payload={category:'viewing-environments',productionUrl:'https://old.test',environments:[{id:'review',name:'レビュー環境',url:'',preview:{entry:'demo.html',files:[{path:'demo.html',code:'<h1>ファイル画面</h1>'}]}}]};
 assert.equal(viewingEnvironments(payload)[0].url,'https://old.test');
 state.role='editor';state.entities=[{id:'env',project_id:'p',kind:'resource',payload}];document.body.innerHTML=viewingRoomHTML();const dispose=bindViewingRoom({projectId:'p',dialog:()=>{},notify:()=>{}});
 document.querySelector('[data-view-env="review"]').click();assert.match(document.querySelector('#view-screen').srcdoc,/ファイル画面/);assert.equal(document.querySelector('#view-source').value,'file');dispose();
});
test('HTML upload combines selected styles and scripts and rejects incomplete bundles',async()=>{
 const file=(name,content)=>({name,size:content.length,text:async()=>content});
 const preview=await readPreviewFiles([file('demo.html','<link rel="stylesheet" href="style.css"><script src="main.js"></script>'),file('style.css','body{color:red}'),file('main.js','document.title="OK"')]);
 const html=buildDraftPreview(preview.files.map(payload=>({payload})),preview.entry);assert.match(html,/color:red/);assert.match(html,/document.title/);
 await assert.rejects(readPreviewFiles([file('demo.html','<script src="missing.js"></script>')]),/下書きがありません/);
 await assert.rejects(readPreviewFiles([file('sample.exe','x')]),/HTML/);
 await assert.rejects(readPreviewFiles([{name:'huge.html',size:3*1024*1024}]),/2MB/);
});
