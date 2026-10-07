import {createClient} from 'npm:@supabase/supabase-js@2.57.4';
const origin='https://koba220.github.io',site=origin+'/digital-engineer-school/';
const headers={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS','Content-Type':'application/json','Vary':'Origin'};
const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response(null,{headers});
 if(req.method!=='POST')return reply({error:'METHOD_NOT_ALLOWED'},405);
 if(req.headers.get('origin')&&req.headers.get('origin')!==origin)return reply({error:'ORIGIN_NOT_ALLOWED'},403);
 const auth=req.headers.get('authorization')||'',url=Deno.env.get('SUPABASE_URL')!;
 const client=createClient(url,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:auth}},auth:{persistSession:false}});
 const {data:{user},error}=await client.auth.getUser(auth.replace(/^Bearer /i,''));if(error||!user)return reply({error:'ログインが必要です'},401);
 let body;try{const raw=await req.text();if(raw.length>2000)throw Error();body=JSON.parse(raw);}catch{return reply({error:'INVALID_REQUEST'},400)}
 const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
 if(!uuid.test(body.projectId)||typeof body.email!=='string'||!['editor','viewer'].includes(body.role))return reply({error:'INVALID_REQUEST'},400);
 const email=body.email.trim().toLowerCase();if(email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return reply({error:'メールアドレスを確認してください'},400);
 const invitationId=crypto.randomUUID();const {error:reserveError}=await client.rpc('create_school_invitation',{p_id:invitationId,p_project:body.projectId,p_email:email,p_role:body.role});
 if(reserveError)return reply({error:reserveError.message.includes('FORBIDDEN')?'プロジェクト所有者のみ招待できます':reserveError.message},403);
 const admin=createClient(url,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
 let delivery='failed';let warning='';
 try{
  const {error:inviteError}=await admin.auth.admin.inviteUserByEmail(email,{redirectTo:site});
  if(!inviteError)delivery='sent';
  else if(inviteError.code==='email_exists'||inviteError.code==='user_already_exists'||/already.*registered/i.test(inviteError.message)){
   const {error:loginError}=await admin.auth.signInWithOtp({email,options:{shouldCreateUser:false,emailRedirectTo:site}});if(!loginError)delivery='sent';else warning=loginError.code||'EMAIL_FAILED';
  }else warning=inviteError.code||'EMAIL_FAILED';
 }catch{warning='EMAIL_FAILED';}
 const {error:recordError}=await admin.from('school_invitations').update({delivery}).eq('id',invitationId);
 if(recordError)return reply({error:'招待を保存しましたが送信結果の記録に失敗しました。招待一覧を確認してください。'},500);
 return reply({id:invitationId,delivery,url:site+'#'+new URLSearchParams({p:body.projectId,r:'campus'}),message:delivery==='sent'?'招待メールを送信しました。相手の入校時に権限が付与されます。':warning==='email_address_not_authorized'?'招待は保存しましたがメール未送信です。SupabaseのSMTP設定が必要です。':'招待は保存しましたがメール未送信です。SMTP設定・メール送信制限を確認してください。'});
});
