import {test} from 'node:test';
import assert from 'node:assert/strict';
const memory=new Map();globalThis.localStorage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,String(v)),removeItem:k=>memory.delete(k)};
const {config}=await import('../config.js');
config.supabaseUrl='';config.supabasePublishableKey='';
const store=await import('../store.js');
test('preview retains entry and keeps project data separate',async()=>{
 store.enterPreview();await store.saveProfile({name:'開発者',department:'DX',avatar:2});
 const original=store.state.projects[0].id;
 const project=await store.createProject({name:'別部署の開発',description:'',department:'開発',visibility:'public',repo:''});
 assert.equal(store.state.projects.length,2,'one project should create one entry');
 await store.selectProject(project.id);await store.put(project.id,'task',{title:'別部署のタスク'});
 await store.selectProject(original);assert.equal(store.list('task',original).length,0,'tasks must not leak between projects');
 await store.signOut();await store.initialize();assert.equal(store.state.user,null,'sign-out must not restore entry');
 store.enterPreview();assert.equal(store.state.profile.name,'開発者');assert.equal(store.state.projects.length,2);
 await store.selectProject(project.id);assert.equal(store.list('task',project.id).length,1);
});
test('cloud writes use the version captured when editing began',async()=>{
 const entity={id:'row',project_id:'project',kind:'task',version:7,payload:{title:'latest'}};let captured;
 store.state.preview=false;store.state.entities=[entity];store.state.role='editor';
 store.state.client={rpc:async(name,args)=>{captured=args;return {data:{...entity,version:8,payload:args.p_payload},error:null}}};
 await store.put('project','task',{title:'edited'},'row',4);
 assert.equal(captured.p_expected,4,'must not silently adopt a newer version from a realtime update');
});
test('project backups exclude other projects and reject invalid imports',()=>{
 store.state.projects=[{id:'p1',name:'学校の開発',description:'',visibility:'private',repo:''}];
 store.state.entities=[{id:'one',project_id:'p1',kind:'task',payload:{title:'保存対象'}},{id:'two',project_id:'p2',kind:'task',payload:{title:'別プロジェクト'}}];
 const backup=store.projectBackup('p1');assert.equal(backup.entities.length,1);assert.equal(backup.entities[0].id,'one');assert.equal(store.validateBackup(backup),backup);
 assert.throws(()=>store.validateBackup({...backup,entities:[...backup.entities,...backup.entities]}),/重複/);
 assert.throws(()=>store.validateBackup({...backup,entities:[{id:'x',kind:'project_members',payload:{role:'owner'}}]}),/形式/);
 assert.throws(()=>store.validateBackup({...backup,version:2}),/形式/);
});
