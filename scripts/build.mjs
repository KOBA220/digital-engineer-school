import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import {config} from '../config.js';
import {validateConfig} from './validate-config.mjs';
const environmentConfigured=Boolean(process.env.SCHOOL_SUPABASE_URL||process.env.SCHOOL_SUPABASE_KEY);
const validated=validateConfig(environmentConfigured?{...config,supabaseUrl:process.env.SCHOOL_SUPABASE_URL,supabasePublishableKey:process.env.SCHOOL_SUPABASE_KEY}:config);
await rm('dist', {recursive:true, force:true}); await mkdir('dist');
for (const file of ['index.html','campus-preview.html','style.css','app.js','store.js','canvas.js','attachments.js','ai.js','campus3d.js','community-data.js','community-chat.js','study-bank.js','study-room.js','config.js','assets','templates']) await cp(file,`dist/${file}`,{recursive:true});
await writeFile('dist/config.js',`export const config=${JSON.stringify(validated)};`);
console.log('Static site built in dist/');
