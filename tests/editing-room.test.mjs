import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import JSZip from 'jszip';
import {state,emit} from '../store.js';
import {editingRoomHTML,bindEditingRoom,flushOfficeEditor} from '../editing-room.js';
import {fieldId,editMap,officeFiles} from '../office-edit-data.js';
const dom=new JSDOM('<body></body>',{url:'https://school.test/'});
globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.DOMParser=dom.window.DOMParser;globalThis.XMLSerializer=dom.window.XMLSerializer;globalThis.JSZip=JSZip;
async function waitFor(fn){const start=Date.now();while(!fn()){if(Date.now()-start>5000)throw Error('editor did not load');await new Promise(resolve=>setImmediate(resolve));}}
test('editor saves typed text, displays remote changes and keeps conflicting drafts until resolved',async()=>{
 const zip=new JSZip();zip.file('word/document.xml','<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>最初の文章</w:t></w:r></w:p></w:body></w:document>');
 const bytes=await zip.generateAsync({type:'base64'}),projectId='p',docId='file',key='word/document.xml#t0';
 state.role='editor';state.preview=false;state.entities=[{id:docId,project_id:projectId,kind:'resource',payload:{category:'office-file',ext:'docx',title:'報告',source:{name:'報告.docx',data:'data:application/zip;base64,'+bytes}}}];
 state.client={rpc:async(name,args)=>({data:{id:args.p_id,project_id:args.p_project,kind:'resource',payload:args.p_payload,version:args.p_expected+1}})};
 document.body.innerHTML=editingRoomHTML();const messages=[];const dispose=bindEditingRoom({projectId,item:docId,onOpen:()=>{},notify:m=>messages.push(m)});
 try{
  await waitFor(()=>document.querySelector('[data-office-field]'));const input=document.querySelector('[data-office-field]');assert.equal(input.value,'最初の文章');
  input.value='編集した文章';input.dispatchEvent(new window.Event('input'));await flushOfficeEditor();assert.equal(editMap(projectId,docId)[key],'編集した文章');
  const id=await fieldId(docId,key),row=state.entities.find(e=>e.id===id);
  state.entities=state.entities.map(e=>e.id===id?{...row,version:row.version+1,payload:{...row.payload,value:'他の人の文章'}}:e);emit();assert.equal(input.value,'他の人の文章');
  input.focus();const current=state.entities.find(e=>e.id===id);state.entities=state.entities.map(e=>e.id===id?{...current,version:current.version+1,payload:{...current.payload,value:'先に保存された変更'}}:e);emit();assert.equal(input.value,'他の人の文章','focused text should not jump during editing');
  input.value='自分の下書き';input.dispatchEvent(new window.Event('input'));await assert.rejects(flushOfficeEditor(),/競合/);assert.equal(editMap(projectId,docId)[key],'先に保存された変更');assert.equal(input.value,'自分の下書き');assert.match(document.querySelector('#office-edit-conflicts').textContent,/同じ項目/);
  const adopt=document.querySelector('[data-office-remote]');adopt.focus();adopt.click();await flushOfficeEditor();assert.equal(input.value,'先に保存された変更');assert.equal(document.querySelectorAll('.office-conflict').length,0);
 }finally{dispose();}
});
test('selecting an Office file uploads the original and opens its saved project record',async()=>{
 const zip=new JSZip();zip.file('word/document.xml','<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>読込テスト</w:t></w:r></w:p></w:body></w:document>');
 const original=await zip.generateAsync({type:'uint8array'}),file=new File([original],'読込テスト.docx',{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
 state.role='editor';state.preview=false;state.entities=[];let uploaded=null,opened=null;
 state.client={storage:{from:()=>({upload:async(path,source)=>{uploaded={path,source};return {};}})},rpc:async(name,args)=>({data:{id:args.p_id,project_id:args.p_project,kind:'resource',payload:args.p_payload,version:1}})};
 document.body.innerHTML=editingRoomHTML();const dispose=bindEditingRoom({projectId:'upload-project',item:null,onOpen:id=>{opened=id;},notify:()=>{}});
 try{const upload=document.querySelector('#office-upload');Object.defineProperty(upload,'files',{value:[file],configurable:true});await upload.onchange();const docs=officeFiles('upload-project');assert.equal(docs.length,1);assert.equal(docs[0].payload.ext,'docx');assert.equal(docs[0].payload.source.path,uploaded.path);assert.equal(docs[0].id,opened);assert.deepEqual(new Uint8Array(await uploaded.source.arrayBuffer()),original);}finally{dispose();}
});
