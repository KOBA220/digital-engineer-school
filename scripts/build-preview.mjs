import {readFile,writeFile} from 'node:fs/promises';
const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');
let css=await read('style.css');
const avatar=await readFile(new URL('../assets/avatars.webp',import.meta.url));css=css.replace("url('assets/avatars.webp')",`url('data:image/webp;base64,${avatar.toString('base64')}')`);
const campus=await readFile(new URL('../assets/school-watercolor.webp',import.meta.url));css=css.replaceAll("url('assets/school-watercolor.webp')",`url('data:image/webp;base64,${campus.toString('base64')}')`);
for(const file of ['chalkboard.webp','room-plaque.webp','wooden-school-reference.png']){const data=await readFile(new URL('../assets/'+file,import.meta.url));css=css.replaceAll(`url('assets/${file}')`,`url('data:image/${file.endsWith('.png')?'png':'webp'};base64,${data.toString('base64')}')`)}
const modules=await Promise.all(['config.js','store.js','attachments.js','ai.js','canvas.js','campus3d.js','study-bank.js','community-data.js','community-chat.js','study-room.js','app.js'].map(read));
modules[0]="export const config={supabaseUrl:'',supabasePublishableKey:'',schoolName:'デジタルエンジニア学校'};";
modules[3]=modules[3].replace(/\besc\b/g,'aiEscape');
modules[4]=modules[4].replace(/\besc\b/g,'canvasEscape');
let js=modules.map(s=>s.replace(/^import .*?;\n/gm,'').replace(/\bexport\s+(?=const|function|async function)/g,'')).join('\n');
for(const [file,mime] of [['school-presentation.pptx','application/vnd.openxmlformats-officedocument.presentationml.presentation'],['system-specification.docx','application/vnd.openxmlformats-officedocument.wordprocessingml.document'],['SKILL.md','text/markdown']]){const data=await readFile(new URL('../templates/'+file,import.meta.url));js=js.replaceAll(`href="templates/${file}"`,`href="data:${mime};base64,${data.toString('base64')}"`)}
js=js.replaceAll("des-preview-v1","des-standalone-preview-v1").replaceAll("des-preview-entered","des-standalone-preview-entered");
const favicon=await read('assets/favicon.svg');
const html=`<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>デジタルエンジニア学校 · プレビュー</title><link rel="icon" href="data:image/svg+xml,${encodeURIComponent(favicon)}"><style>${css}</style></head><body><div id="app"></div><div id="toast" role="status" aria-live="polite"></div><dialog id="modal"></dialog><script type="module">${js.replaceAll('</script','<\\/script')}</script></body></html>`;
await writeFile(new URL('../../Digital_Engineer_School_Preview.html',import.meta.url),html);
console.log('Standalone preview created');
