export function validateConfig(config){
 const url=String(config.supabaseUrl||'').trim(),key=String(config.supabasePublishableKey||'').trim();
 if(!url&&!key)return {...config,supabaseUrl:'',supabasePublishableKey:''};
 if(!url||!key)throw Error('SupabaseのURLと公開キーを両方設定してください。');
 let parsed;try{parsed=new URL(url)}catch{throw Error('SupabaseのURLを確認してください。')}
 if(parsed.protocol!=='https:'||parsed.username||parsed.password||parsed.search||parsed.hash||!['','/'].includes(parsed.pathname))throw Error('SupabaseのProject URLをHTTPSの形式で設定してください。');
 if(key.startsWith('sb_secret_'))throw Error('秘密キーは公開できません。publishable keyを設定してください。');
 if(!key.startsWith('sb_publishable_')){
  let role;try{role=JSON.parse(Buffer.from(key.split('.')[1],'base64url').toString('utf8')).role}catch{}
  if(role!=='anon')throw Error('公開用publishable keyまたはanon keyを設定してください。service_roleキーは使用できません。');
 }
 return {...config,supabaseUrl:parsed.origin,supabasePublishableKey:key};
}
