import {test} from 'node:test';
import assert from 'node:assert/strict';
import {state} from '../store.js';
import {fieldId,editDecision,saveOfficeField,editMap} from '../office-edit-data.js';
test('field IDs stay stable per file and conflict decisions never discard unseen changes',async()=>{
 const id=await fieldId('doc','A1');assert.equal(await fieldId('doc','A1'),id);assert.notEqual(await fieldId('other','A1'),id);assert.match(id,/^[\da-f]{8}-[\da-f]{4}-5[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/);
 assert.equal(editDecision('old','new','mine'),'conflict');assert.equal(editDecision('old','old','mine'),'save');assert.equal(editDecision('old','mine','mine'),'saved');
});
test('simultaneous edits to different fields persist separately and same-field edits require resolution',async()=>{
 const projectId='p',docId='doc';state.preview=false;state.role='editor';state.entities=[{id:docId,project_id:projectId,kind:'resource',payload:{category:'office-file'}}];const backend=new Map();
 state.client={rpc:async(name,args)=>{const old=backend.get(args.p_id);if((old?.version||0)!==args.p_expected)return {error:{message:'CONFLICT'}};const row={id:args.p_id,project_id:args.p_project,kind:'resource',payload:args.p_payload,version:(old?.version||0)+1};backend.set(row.id,row);return {data:row};}};
 await Promise.all(['A1','B1'].map(key=>saveOfficeField({projectId,docId,key,base:'',original:'',value:key==='A1'?'100':'200'})));
 assert.deepEqual(editMap(projectId,docId),{A1:'100',B1:'200'});
 await saveOfficeField({projectId,docId,key:'A1',base:'100',original:'',value:'150'});
 await assert.rejects(saveOfficeField({projectId,docId,key:'A1',base:'100',original:'',value:'170'}),e=>e.conflict&&e.remote==='150');assert.equal(editMap(projectId,docId).A1,'150');
 await saveOfficeField({projectId,docId,key:'A1',base:'150',original:'',value:'170'});assert.equal(editMap(projectId,docId).A1,'170');
 state.role='viewer';await assert.rejects(saveOfficeField({projectId,docId,key:'B1',base:'200',original:'',value:'999'}),/閲覧権限/);assert.equal(editMap(projectId,docId).B1,'200');
});
