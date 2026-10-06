import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
await rm('dist', {recursive:true, force:true}); await mkdir('dist');
for (const file of ['index.html','style.css','app.js','store.js','canvas.js','config.js','assets','templates']) await cp(file,`dist/${file}`,{recursive:true});
if (process.env.SCHOOL_SUPABASE_URL && process.env.SCHOOL_SUPABASE_KEY) await writeFile('dist/config.js',`export const config=${JSON.stringify({supabaseUrl:process.env.SCHOOL_SUPABASE_URL,supabasePublishableKey:process.env.SCHOOL_SUPABASE_KEY,schoolName:'デジタルエンジニア学校'})};`);
console.log('Static site built in dist/');
