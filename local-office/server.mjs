import http from 'node:http';
import {createHmac,timingSafeEqual,randomUUID,randomBytes,createHash} from 'node:crypto';
import {mkdir,readFile,writeFile,rename,readdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {validateConfig} from '../scripts/validate-config.mjs';

const MAX=20*1024*1024;
const fail=(message,status=400)=>Object.assign(new Error(message),{status});
const uuid=value=>/^[a-f0-9-]{36}$/i.test(value||'');
const types={docx:'word',xlsx:'cell',pptx:'slide'};
const mimes={docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',pptx:'application/vnd.openxmlformats-officedocument.presentationml.presentation'};
export function signJWT(payload,secret){const input=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')+'.'+Buffer.from(JSON.stringify(payload)).toString('base64url');return input+'.'+createHmac('sha256',secret).update(input).digest('base64url');}
export function verifyJWT(token,secret){
 const [head,body,sig,...rest]=String(token||'').split('.');if(rest.length||!head||!body||!sig)throw fail('署名を確認できません',403);
 const expected=createHmac('sha256',secret).update(head+'.'+body).digest(),actual=Buffer.from(sig,'base64url');
 if(actual.length!==expected.length||!timingSafeEqual(actual,expected)||JSON.parse(Buffer.from(head,'base64url')).alg!=='HS256')throw fail('署名が一致しません',403);
 const payload=JSON.parse(Buffer.from(body,'base64url'));if(payload.exp&&payload.exp<Date.now()/1000)throw fail('署名の期限が切れています',403);return payload;
}
async function body(req,max=MAX){let size=0;const parts=[];for await(const part of req){size+=part.length;if(size>max)throw fail('ファイルは20MBまでです',413);parts.push(part);}return Buffer.concat(parts);}
export async function createOfficeServer(options){
 const {supabaseUrl,supabaseKey,secret,publicUrl,schoolOrigin,dataDir,fetchImpl=fetch,docsUrl='http://documentserver',internalUrl='http://bridge:3000'}=options;
 if(!secret||secret.length<32)throw Error('JWT_SECRETは32文字以上必要です');
 validateConfig({supabaseUrl,supabasePublishableKey:supabaseKey});
 if(!publicUrl?.startsWith('https://')||!schoolOrigin)throw Error('HTTPS接続先と学校のOriginを設定してください');
 const dir=resolve(dataDir);await mkdir(dir,{recursive:true,mode:0o700});const sessions=new Map(),credentials=new Map(),locks=new Map();
 const locked=async(key,work)=>{const previous=locks.get(key)||Promise.resolve();const next=previous.catch(()=>{}).then(work);locks.set(key,next);try{return await next;}finally{if(locks.get(key)===next)locks.delete(key);}};
 const persist=async s=>{const path=resolve(dir,s.key+'.json');await writeFile(path+'.tmp',JSON.stringify(s),{mode:0o600});await rename(path+'.tmp',path);};
 for(const path of await readdir(dir)){if(!/^[a-f0-9]{64}\.json$/.test(path))continue;const s=JSON.parse(await readFile(resolve(dir,path),'utf8'));sessions.set(s.key,s);}
 const api=async(path,token,init={})=>{
  const response=await fetchImpl(supabaseUrl+path,{...init,headers:{apikey:supabaseKey,Authorization:'Bearer '+token,...init.headers},signal:AbortSignal.timeout(30000)});
  if(!response.ok)throw fail('認証・権限または保存処理を確認してください',response.status===401||response.status===403?403:502);
  return response;
 };
 const json=async(path,token,init={})=>(await api(path,token,{...init,headers:{'Content-Type':'application/json',...init.headers}})).json();
 const access=async(projectId,docId,token)=>{
  if(!uuid(projectId)||!uuid(docId))throw fail('ファイルIDが不正です');
  const user=await json('/auth/v1/user',token);if(!user.id)throw fail('ログインが必要です',401);
  const rows=await json(`/rest/v1/entities?id=eq.${docId}&project_id=eq.${projectId}&deleted=eq.false&select=*`,token),row=rows[0];
  if(!row||row.kind!=='resource'||row.payload.category!=='office-file'||!types[row.payload.ext])throw fail('ファイルの閲覧権限がありません',403);
  const members=await json(`/rest/v1/project_members?project_id=eq.${projectId}&user_id=eq.${user.id}&select=role`,token);
  return {user,row,edit:['owner','editor'].includes(members[0]?.role)};
 };
 const update=async(row,payload,token)=>{
  const saved=await json('/rest/v1/rpc/save_entity',token,{method:'POST',body:JSON.stringify({p_id:row.id,p_project:row.project_id,p_kind:'resource',p_payload:payload,p_expected:row.version,p_deleted:false})});return Array.isArray(saved)?saved[0]:saved;
 };
 const upload=async(row,bytes,token)=>{
  const path=row.project_id+'/'+randomUUID();await api('/storage/v1/object/school-files/'+path,token,{method:'POST',headers:{'Content-Type':mimes[row.payload.ext]},body:bytes});
  return {path,name:row.payload.source.name,size:bytes.length,mime:mimes[row.payload.ext]};
 };
 const original=async(row,token)=>{
  if(!row.payload.source?.path?.startsWith(row.project_id+'/'))throw fail('保存ファイルのパスを確認してください');
  const signed=await json('/storage/v1/object/sign/school-files/'+row.payload.source.path,token,{method:'POST',body:JSON.stringify({expiresIn:300})});
  const signedPath=signed.signedURL;const url=new URL(signedPath.startsWith('/object/')?'/storage/v1'+signedPath:signedPath,supabaseUrl);if(url.origin!==new URL(supabaseUrl).origin||!url.pathname.startsWith('/storage/v1/object/sign/'))throw fail('ファイルの取得先が不正です');
  return download(url.href);
 };
 const download=async url=>{const response=await fetchImpl(url,{redirect:'error',signal:AbortSignal.timeout(60000)});if(!response.ok)throw fail('ファイルを取得できません',502);const parts=[];let size=0;for await(const chunk of response.body){size+=chunk.length;if(size>MAX)throw fail('ファイルは20MBまでです',413);parts.push(chunk);}return Buffer.concat(parts);};
 async function savePending(s){
  if(!s.pending)return;let last;
  for(const [userId,token] of credentials.get(s.key)||[]){
   try{
    const {row,edit,user}=await access(s.projectId,s.docId,token);if(!edit||user.id!==userId)continue;
    if(row.payload.onlyofficeRevision!==s.revision){if(row.payload.onlyofficeLastSave===s.pending.id){s.pending=null;s.closed=true;await persist(s);return;}throw fail('ファイルの版が変わっています。PCの保存データを確認してください',409);}
    const bytes=await readFile(resolve(dir,s.pending.file));const source=await upload(row,bytes,token);
    await update(row,{...row.payload,source,onlyofficeLastSave:s.pending.id,onlyofficeSavedAt:new Date().toISOString(),onlyofficeRevision:s.pending.final?randomUUID():s.revision},token);
    await writeFile(resolve(dir,s.key+'.input'),bytes,{mode:0o600});s.lastSave=s.pending.id;s.savedAt=new Date().toISOString();s.closed=!!s.pending.final;s.pending=null;await persist(s);return;
   }catch(error){last=error;}
  }
  throw last||fail('保存待ちです。編集者が再接続すると保存を再試行します',503);
 }
 const send=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
 const handler=async(req,res)=>{
  try{
   const origin=req.headers.origin;
   if(origin&&origin!==schoolOrigin)throw fail('許可されていない接続元です',403);
   if(origin){res.setHeader('Access-Control-Allow-Origin',schoolOrigin);res.setHeader('Vary','Origin');res.setHeader('Access-Control-Allow-Headers','Authorization,Content-Type');res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');res.setHeader('Access-Control-Allow-Private-Network','true');}
   if(req.method==='OPTIONS'){res.writeHead(204);res.end();return;}
   const url=new URL(req.url,'http://bridge');
   if(url.pathname==='/api/health'&&req.method==='GET'){let ready=false;try{const r=await fetchImpl(docsUrl+'/healthcheck',{signal:AbortSignal.timeout(5000)});ready=r.ok&&(await r.text()).trim()==='true';}catch{}send(res,ready?200:503,{ready,service:'school-local-office'});return;}
   if(url.pathname==='/api/session'&&req.method==='POST'){
    const projectId=url.searchParams.get('project'),docId=url.searchParams.get('document'),token=req.headers.authorization?.replace(/^Bearer /,'');
    if(!token)throw fail('ログインが必要です',401);const seed=await body(req);
    await locked(docId,async()=>{
     let {user,row,edit}=await access(projectId,docId,token);
     if(!row.payload.onlyofficeRevision){
      if(!edit)throw fail('最初に編集者がレイアウト編集で開いてください',403);
      const bytes=seed.length?seed:await original(row,token);if(bytes[0]!==80||bytes[1]!==75)throw fail('Officeファイルを確認してください');
      const source=await upload(row,bytes,token);row=await update(row,{...row.payload,source,onlyofficeRevision:randomUUID(),onlyofficeManaged:true},token);
     }
     let key=createHash('sha256').update(row.id+':'+row.payload.onlyofficeRevision).digest('hex'),s=sessions.get(key);if(s?.closed&&!s.pending)s=null;
     if(!s){s={key,projectId,docId,revision:row.payload.onlyofficeRevision,cap:randomBytes(32).toString('hex'),closed:false};await writeFile(resolve(dir,key+'.input'),await original(row,token),{mode:0o600});sessions.set(key,s);await persist(s);}
     if(edit){if(!credentials.has(key))credentials.set(key,new Map());credentials.get(key).set(user.id,token);}
     if(s.pending){await savePending(s);if(s.closed)throw fail('保存が完了しました。もう一度ファイルを開いてください',409);}
     if(s.closed)throw fail('この編集は完了しました。もう一度開いてください',409);
     const config={documentType:types[row.payload.ext],height:'100%',width:'100%',document:{fileType:row.payload.ext,key,title:row.payload.title,url:internalUrl+'/api/file/'+s.cap,permissions:{edit,download:true,print:true}},editorConfig:{mode:edit?'edit':'view',lang:'ja',callbackUrl:internalUrl+'/api/callback/'+s.cap,user:{id:user.id,name:user.user_metadata?.name||user.email||'メンバー'},coEditing:{mode:'fast',change:true},customization:{forcesave:true,autosave:true}}};
     config.token=signJWT(config,secret);send(res,200,{config,key,apiUrl:publicUrl+'/web-apps/apps/api/documents/api.js'});
    });return;
   }
   const fileMatch=url.pathname.match(/^\/api\/file\/([a-f0-9]{64})$/);
   if(fileMatch&&req.method==='GET'){const s=[...sessions.values()].find(s=>s.cap===fileMatch[1]);if(!s||s.closed)throw fail('ファイルが見つかりません',404);const bytes=await readFile(resolve(dir,s.key+'.input'));res.writeHead(200,{'Content-Type':'application/octet-stream','Cache-Control':'no-store'});res.end(bytes);return;}
   const callbackMatch=url.pathname.match(/^\/api\/callback\/([a-f0-9]{64})$/);
   if(callbackMatch&&req.method==='POST'){
    const raw=JSON.parse((await body(req,1024*1024)).toString());const jwt=raw.token||req.headers.authorization?.replace(/^Bearer /,'');const signed=verifyJWT(jwt,secret),data=signed.payload||signed;
    const s=[...sessions.values()].find(s=>s.cap===callbackMatch[1]);if(!s||s.key!==data.key)throw fail('編集セッションが一致しません',403);
    await locked(s.docId,async()=>{
     if(s.closed){send(res,200,{error:0});return;}
     if([2,6].includes(data.status)){
      const savedUrl=new URL(data.url);if(![new URL(docsUrl).origin,new URL(publicUrl).origin].includes(savedUrl.origin)||!savedUrl.pathname.startsWith('/cache/files/')||savedUrl.username||savedUrl.password)throw fail('保存先URLが不正です',403);
      const bytes=await download(docsUrl+savedUrl.pathname+savedUrl.search),id=randomUUID(),file=s.key+'.'+id+'.saved';await writeFile(resolve(dir,file),bytes,{mode:0o600});s.pending={id,file,final:data.status===2};await persist(s);
      try{await savePending(s);}catch{send(res,200,{error:1});return;}
     }else if(data.status===4){s.closed=true;await persist(s);}else if([3,7].includes(data.status)){send(res,200,{error:1});return;}
     send(res,200,{error:0});
    });return;
   }
   if(['/api/keepalive','/api/force-save'].includes(url.pathname)&&req.method==='POST'){
    const input=JSON.parse((await body(req,4096)).toString()),s=sessions.get(input.key),token=req.headers.authorization?.replace(/^Bearer /,'');if(!s||!token)throw fail('編集セッションが見つかりません',404);
    const {user,edit}=await access(s.projectId,s.docId,token);if(edit){if(!credentials.has(s.key))credentials.set(s.key,new Map());credentials.get(s.key).set(user.id,token);}
    await locked(s.docId,async()=>{if(s.pending)await savePending(s);});
    if(url.pathname==='/api/force-save'&&edit&&!s.closed){
     const command={c:'forcesave',key:s.key},marker=s.lastSave;const response=await fetchImpl(docsUrl+'/coauthoring/CommandService.ashx',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...command,token:signJWT(command,secret)}),signal:AbortSignal.timeout(10000)});
     if(!response.ok)throw fail('保存を要求できません',502);const result=await response.json();if(![0,4].includes(result.error))throw fail('保存を要求できません。編集画面の状態を確認してください',502);send(res,200,{wait:result.error===0,marker});return;
    }
    send(res,200,{pending:!!s.pending,closed:s.closed,lastSave:s.lastSave,savedAt:s.savedAt});return;
   }
   throw fail('見つかりません',404);
  }catch(error){send(res,error.status||500,{error:error.status?error.message:'接続・保存処理に失敗しました。PC側の状態を確認してください'});}
 };
 return http.createServer(handler);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const server=await createOfficeServer({supabaseUrl:process.env.SUPABASE_URL,supabaseKey:process.env.SUPABASE_PUBLIC_KEY,secret:process.env.JWT_SECRET,publicUrl:process.env.OFFICE_PUBLIC_URL,schoolOrigin:process.env.SCHOOL_ORIGIN,dataDir:process.env.DATA_DIR||'./data'});
 server.listen(3000,'0.0.0.0',()=>console.log('School Office bridge listening on port 3000'));
}
