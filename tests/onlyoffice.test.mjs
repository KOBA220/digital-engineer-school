import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readdir,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createOfficeServer,signJWT,verifyJWT} from '../local-office/server.mjs';
import {officeConnectionURL} from '../onlyoffice-client.js';
import {mountOnlyOffice} from '../onlyoffice-client.js';
import {state} from '../store.js';
import {JSDOM} from 'jsdom';

test('PC connection URL and ONLYOFFICE signatures reject unsafe URLs and forged tokens',()=>{
 assert.equal(officeConnectionURL('https://192.168.1.2:8443/'),'https://192.168.1.2:8443');
 for(const url of ['http://localhost:8443','javascript:alert(1)','https://user:pw@pc.test','https://pc.test/path'])assert.throws(()=>officeConnectionURL(url));
 const token=signJWT({key:'test',status:2},'secret');assert.equal(verifyJWT(token,'secret').key,'test');assert.throws(()=>verifyJWT(token,'different'));
 assert.throws(()=>verifyJWT(signJWT({exp:1},'secret'),'secret'),/期限/);
});
test('editor mounts the configured PC API, carries user authentication, confirms save and destroys on exit',async()=>{
 const dom=new JSDOM('<div id="onlyoffice-save-status"></div><div id="editor"></div>',{url:'https://school.test'});
 const originalFetch=globalThis.fetch;globalThis.window=dom.window;globalThis.document=dom.window.document;
 const calls=[];let destroyed=false,configuration;
 state.preview=false;state.entities=[{id:'connection',project_id:'p',kind:'resource',payload:{category:'onlyoffice-connection',url:'https://pc.test:8443'}}];state.client={auth:{getSession:async()=>({data:{session:{access_token:'user-access-token'}}})}};
 window.DocsAPI={DocEditor:function(id,config){assert.equal(id,'onlyoffice-document');configuration=config;this.destroyEditor=()=>{destroyed=true;};}};
 const append=document.head.append.bind(document.head);document.head.append=node=>{append(node);setImmediate(()=>node.onload());};
 globalThis.fetch=async(url,options)=>{calls.push({url,options});assert.equal(options.headers.Authorization,'Bearer user-access-token');return new Response(JSON.stringify(url.includes('/api/session')?{key:'session-key',apiUrl:'https://pc.test:8443/web-apps/apps/api/documents/api.js',config:{documentType:'word',document:{permissions:{edit:false}},token:'signed-config'}}:url.includes('force-save')?{wait:false}:{savedAt:'2026-10-10T00:00:00Z'}));};
 let cleanup;try{cleanup=await mountOnlyOffice({projectId:'p',row:{id:'document'},container:document.querySelector('#editor'),notify:()=>{}});assert.equal(configuration.documentType,'word');assert.equal(configuration.document.permissions.edit,false);assert.equal(configuration.token,'signed-config');await cleanup.flush();assert.match(document.querySelector('#onlyoffice-save-status').textContent,/保存済み/);assert.ok(calls.some(call=>call.url.includes('force-save')));cleanup();assert.equal(destroyed,true);}finally{globalThis.fetch=originalFetch;dom.window.close();}
});
test('local bridge co-edits one key, checks roles, saves callbacks and recovers pending saves after restart',async()=>{
 const project='11111111-1111-4111-8111-111111111111',doc='22222222-2222-4222-8222-222222222222',secret='a'.repeat(48),dir=await mkdtemp(join(tmpdir(),'school-office-'));
 let row={id:doc,project_id:project,version:1,kind:'resource',payload:{category:'office-file',ext:'pptx',title:'スライド',source:{name:'slides.pptx',path:project+'/original'}}},expired=false,savedBytes=Buffer.from('PK-original'),uploads=0,forceCallback=null;
 const response=(data,status=200)=>new Response(typeof data==='string'?data:JSON.stringify(data),{status});
 const mock=async(value,init={})=>{
  const url=new URL(value),token=init.headers?.Authorization?.replace('Bearer ','');
  if(url.host==='database.test'){
   if(token==='bad'||(expired&&token==='editor'))return response({},401);
   if(url.pathname==='/auth/v1/user')return response({id:token==='viewer'?'viewer-user':'editor-user',email:'member@example.com'});
   if(url.pathname==='/rest/v1/entities')return response(url.searchParams.get('project_id')==='eq.'+project?[structuredClone(row)]:[]);
   if(url.pathname==='/rest/v1/project_members')return response([{role:token==='viewer'?'viewer':'editor'}]);
   if(url.pathname.includes('/storage/v1/object/sign/'))return response({signedURL:'/object/sign/source?token=test'});
   if(url.pathname==='/storage/v1/object/sign/source')return new Response(savedBytes);
   if(url.pathname.startsWith('/storage/v1/object/school-files/')){uploads++;savedBytes=Buffer.from(init.body);return response({});}
   if(url.pathname==='/rest/v1/rpc/save_entity'){const args=JSON.parse(init.body);if(args.p_expected!==row.version)return response({},409);row={...row,version:row.version+1,payload:args.p_payload};return response(row);}
  }
  if(url.host==='documentserver'&&url.pathname==='/healthcheck')return response('true');
  if(url.host==='documentserver'&&url.pathname.startsWith('/cache/files/'))return new Response(Buffer.from('PK-edited-layout'));
  if(url.host==='documentserver'&&url.pathname==='/coauthoring/CommandService.ashx'){const input=JSON.parse(init.body);assert.equal(verifyJWT(input.token,secret).c,'forcesave');if(forceCallback){setTimeout(forceCallback,5);return response({error:0});}return response({error:4});}
  throw Error('Unexpected request: '+url.href);
 };
 const options={supabaseUrl:'https://database.test',supabaseKey:'sb_publishable_test',secret,publicUrl:'https://pc.test:8443',schoolOrigin:'https://school.test',dataDir:dir,fetchImpl:mock};
 let server=await createOfficeServer(options);const start=async()=>{await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));return 'http://127.0.0.1:'+server.address().port;};let base=await start();
 const stop=()=>new Promise(resolve=>server.close(resolve));
 const session=async(token='editor',pid=project,seed='PK-existing-text-edits')=>fetch(base+`/api/session?project=${pid}&document=${doc}`,{method:'POST',headers:{Authorization:'Bearer '+token,Origin:'https://school.test'},body:seed});
 const callback=async(config,status,url='https://pc.test:8443/cache/files/edit/output.pptx')=>fetch(base+new URL(config.editorConfig.callbackUrl).pathname,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:signJWT({key:config.document.key,status,url},secret)})});
 try{
  assert.equal((await fetch(base+'/api/health',{headers:{Origin:'https://evil.test'}})).status,403);
  assert.equal((await session('bad')).status,403);assert.equal((await session('editor','33333333-3333-4333-8333-333333333333')).status,403);assert.equal((await session('viewer')).status,403);
  const first=await (await session()).json();assert.equal(first.config.documentType,'slide');assert.equal(first.config.document.permissions.edit,true);assert.equal(row.payload.onlyofficeManaged,true);assert.equal(savedBytes.toString(),'PK-existing-text-edits');
  const second=await (await session()).json(),viewer=await (await session('viewer')).json();assert.equal(first.key,second.key);assert.equal(viewer.key,first.key);assert.equal(viewer.config.editorConfig.mode,'view');assert.equal(viewer.config.document.permissions.edit,false);
  assert.equal((await callback(first.config,6,'https://attacker.test/cache/files/output')).status,403);
  const forged=await fetch(base+new URL(first.config.editorConfig.callbackUrl).pathname,{method:'POST',body:JSON.stringify({key:first.key,status:2,url:'http://documentserver/cache/files/edit/output.pptx'})});assert.equal(forged.status,403);
  assert.deepEqual(await (await callback(first.config,6)).json(),{error:0});assert.equal(savedBytes.toString(),'PK-edited-layout');assert.equal((await (await session()).json()).key,first.key,'force-save must keep the active co-editing key');
  forceCallback=()=>callback(first.config,6);const forced=await (await fetch(base+'/api/force-save',{method:'POST',headers:{Authorization:'Bearer editor'},body:JSON.stringify({key:first.key})})).json();assert.equal(forced.wait,true);
  let confirmed=false;for(let i=0;i<30;i++){const current=await (await fetch(base+'/api/keepalive',{method:'POST',headers:{Authorization:'Bearer editor'},body:JSON.stringify({key:first.key})})).json();if(current.lastSave!==forced.marker){confirmed=true;break;}await new Promise(resolve=>setTimeout(resolve,10));}assert.equal(confirmed,true,'explicit save is confirmed only after persistence');forceCallback=null;
  expired=true;assert.deepEqual(await (await callback(first.config,2)).json(),{error:1});const records=await readdir(dir);assert.ok(records.some(file=>file.endsWith('.saved')));const persisted=JSON.parse(await readFile(join(dir,first.key+'.json'),'utf8'));assert.ok(persisted.pending);assert.doesNotMatch(JSON.stringify(persisted),/Bearer|editor-user|access_token/);
  await stop();server=await createOfficeServer(options);base=await start();expired=false;
  assert.equal((await session()).status,409,'pending final save is recovered before reopening');
  const reopened=await (await session()).json();assert.notEqual(reopened.key,first.key);assert.equal(savedBytes.toString(),'PK-edited-layout');
  assert.deepEqual(await (await callback(reopened.config,4)).json(),{error:0});assert.equal((await session()).status,200,'close without changes must allow reopening');assert.ok(uploads>=3);
 }finally{await stop();await rm(dir,{recursive:true,force:true});}
});
