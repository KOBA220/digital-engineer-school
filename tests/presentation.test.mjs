import test from 'node:test';
import assert from 'node:assert/strict';
import {access,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {presentationCatalog} from '../presentation-catalog.js';
import {presentationMatches,presentationBooks} from '../presentation-room.js';
import {presentationSources} from '../scripts/presentation-assets.mjs';

test('situation and component catalog link to complete, real source assets',async()=>{
 assert.equal(presentationCatalog.scenarios.length,19);
 assert.equal(presentationCatalog.components.length,336);
 assert.equal(new Set([...presentationCatalog.scenarios,...presentationCatalog.components].map(i=>i.id)).size,355);
 assert.equal(presentationCatalog.scenarios.filter(i=>i.group==='report').length,7);
 for(const style of ['anime','mini','icon','real']){
  const items=presentationCatalog.components.filter(i=>i.style===style);
  assert.equal(items.length,84);
  assert.equal(new Set(items.map(i=>i.category)).size,7);
  for(const category of new Set(items.map(i=>i.category)))assert.equal(items.filter(i=>i.category===category).length,12);
 }
 await Promise.all([...presentationCatalog.scenarios,...presentationCatalog.components].map(item=>access(new URL('../'+item.image,import.meta.url))));
 for(const item of presentationCatalog.scenarios){assert.ok(item.purpose&&item.composition&&item.effect);assert.ok(item.page>=3&&item.page<=22);}
 assert.equal(presentationBooks.length,3);
});

test('search and filters choose the requested situation or component style',()=>{
 assert.equal(presentationMatches('layouts',{group:'report'}).length,7);
 assert.equal(presentationMatches('layouts',{search:'進捗'}).at(0).page,16);
 assert.equal(presentationMatches('components',{category:'技術',style:'mini'}).length,12);
 assert.equal(presentationMatches('components',{style:'anime',search:'クラウド'}).at(0).name,'クラウド');
 assert.equal(presentationMatches('components',{search:'存在しない部品'}).length,0);
 for(const style of ['icon','real']){assert.equal(presentationMatches('components',{style,category:'職業'}).length,12);assert.equal(presentationMatches('components',{style,search:'クラウド'}).at(0).name,'クラウド');}
});

test('published PowerPoint downloads preserve all three originals byte for byte',async()=>{
 for(const source of presentationSources){
  const data=Buffer.concat(await Promise.all(source.parts.map(part=>readFile(new URL('../templates/presentation/'+part,import.meta.url)))));
  assert.equal(data.length,source.bytes);
  assert.equal(createHash('sha256').update(data).digest('hex'),source.sha256);
  assert.equal(data.subarray(0,2).toString(),'PK');
  assert.ok(presentationBooks.some(book=>book.file.endsWith(source.file)));
 }
});
