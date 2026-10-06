import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateConfig} from '../scripts/validate-config.mjs';
const url='https://school.supabase.co';
test('empty configuration stays in preview; public keys are accepted',()=>{
 assert.equal(validateConfig({}).supabaseUrl,'');
 assert.equal(validateConfig({supabaseUrl:url+'/',supabasePublishableKey:'sb_publishable_demo'}).supabaseUrl,url);
 const anon='header.'+Buffer.from(JSON.stringify({role:'anon'})).toString('base64url')+'.signature';
 assert.equal(validateConfig({supabaseUrl:url,supabasePublishableKey:anon}).supabasePublishableKey,anon);
});
test('incomplete settings and secret keys cannot be published',()=>{
 for(const key of ['sb_secret_demo','header.'+Buffer.from(JSON.stringify({role:'service_role'})).toString('base64url')+'.signature','wrong-key'])assert.throws(()=>validateConfig({supabaseUrl:url,supabasePublishableKey:key}));
 assert.throws(()=>validateConfig({supabaseUrl:url}));
 assert.throws(()=>validateConfig({supabaseUrl:'http://school.supabase.co',supabasePublishableKey:'sb_publishable_demo'}));
});
