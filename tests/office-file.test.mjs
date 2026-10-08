import {test} from 'node:test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import {DOMParser,XMLSerializer} from '@xmldom/xmldom';
import {readOffice,exportOffice,officeExtension,checkOfficeZip,parseCellAddress} from '../office-file.js';
globalThis.DOMParser=DOMParser;globalThis.XMLSerializer=XMLSerializer;
const W='http://schemas.openxmlformats.org/wordprocessingml/2006/main',S='http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const bytes=async files=>{const zip=new JSZip();for(const [name,data] of Object.entries(files))zip.file(name,data);return zip.generateAsync({type:'uint8array',compression:'DEFLATE'});};
test('Word text edits preserve pictures, run styling and untouched archive parts',async()=>{
 const original=await bytes({'word/document.xml':`<w:document xmlns:w="${W}"><w:body><w:p><w:r><w:rPr><w:b/></w:rPr><w:t>最初</w:t></w:r><w:r><w:t>後半</w:t></w:r></w:p></w:body></w:document>`,'word/media/image1.png':new Uint8Array([1,2,3,4]),'word/styles.xml':'<styles>unchanged</styles>'});
 const model=await readOffice(original,'報告.docx',{Zip:JSZip});assert.equal(model.sections[0].keys.length,2);
 const out=await exportOffice(model,{'word/document.xml#t0':' 日本語 & <編集> '},{Zip:JSZip}),zip=await JSZip.loadAsync(out);
 const xml=await zip.file('word/document.xml').async('string');assert.match(xml,/<w:b\s*\/>/);assert.match(xml,/日本語 &amp; &lt;編集&gt;/);assert.match(xml,/後半/);assert.match(xml,/xml:space="preserve"/);
 assert.deepEqual(await zip.file('word/media/image1.png').async('uint8array'),new Uint8Array([1,2,3,4]));assert.equal(await zip.file('word/styles.xml').async('string'),'<styles>unchanged</styles>');assert.equal(model.fields['word/document.xml#t0'].value,'最初');
});
test('PowerPoint uses presentation order and keeps graphics when editing text',async()=>{
 const original=await bytes({'ppt/presentation.xml':'<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><p:sldIdLst><p:sldId id="257" r:id="rId2"/><p:sldId id="256" r:id="rId1"/></p:sldIdLst></p:presentation>','ppt/_rels/presentation.xml.rels':'<Relationships><Relationship Id="rId1" Target="slides/slide1.xml"/><Relationship Id="rId2" Target="slides/slide2.xml"/></Relationships>','ppt/slides/slide1.xml':'<slide xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:t>後ろ</a:t></slide>','ppt/slides/slide2.xml':'<slide xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:t>前</a:t><graphics data="keep"/></slide>','ppt/media/image.png':new Uint8Array([9,8,7])});
 const model=await readOffice(original,'発表.pptx',{Zip:JSZip});assert.equal(model.sections[0].path,'ppt/slides/slide2.xml');
 const out=await exportOffice(model,{'ppt/slides/slide2.xml#t0':'変更'},{Zip:JSZip}),zip=await JSZip.loadAsync(out);assert.match(await zip.file('ppt/slides/slide2.xml').async('string'),/data="keep"/);assert.match(await zip.file('ppt/slides/slide2.xml').async('string'),/変更/);assert.match(await zip.file('ppt/slides/slide1.xml').async('string'),/後ろ/);assert.deepEqual(await zip.file('ppt/media/image.png').async('uint8array'),new Uint8Array([9,8,7]));
});
test('Excel edits one cell without changing shared strings, preserves styles and recalculates on open',async()=>{
 const files={'xl/workbook.xml':`<workbook xmlns="${S}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="売上" sheetId="1" r:id="rId1"/></sheets></workbook>`,'xl/_rels/workbook.xml.rels':'<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/><Relationship Id="rId9" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/calcChain" Target="calcChain.xml"/></Relationships>','xl/sharedStrings.xml':`<sst xmlns="${S}"><si><t>共有文字</t></si></sst>`,'xl/worksheets/sheet1.xml':`<worksheet xmlns="${S}"><dimension ref="A1:D1"/><sheetData><row r="1"><c r="A1" s="3" t="s"><v>0</v></c><c r="B1" t="s"><v>0</v></c><c r="C1"><f>SUM(A2:A3)</f><v>12</v></c><c r="D1"><f t="array" ref="D1:D2">A1:A2</f><v>1</v></c></row></sheetData></worksheet>`,'xl/calcChain.xml':'<calcChain/>','[Content_Types].xml':'<Types><Override PartName="/xl/calcChain.xml" ContentType="chain"/></Types>'};
 const original=await bytes(files),model=await readOffice(original,'集計.xlsx',{Zip:JSZip});assert.equal(model.fields['xl/worksheets/sheet1.xml#cell:C1'].value,'=SUM(A2:A3)');assert.equal(model.fields['xl/worksheets/sheet1.xml#cell:D1'].locked,true);
 const changes={'xl/worksheets/sheet1.xml#cell:A1':'個別の文字','xl/worksheets/sheet1.xml#cell:C1':'=SUM(A2:A4)','xl/worksheets/sheet1.xml#cell:A3':'0012','xl/worksheets/sheet1.xml#cell:A2':'42'};
 const output=await exportOffice(model,changes,{Zip:JSZip}),zip=await JSZip.loadAsync(output),parsed=await readOffice(output,'集計.xlsx',{Zip:JSZip});
 assert.equal(parsed.fields['xl/worksheets/sheet1.xml#cell:B1'].value,'共有文字');assert.equal(parsed.fields['xl/worksheets/sheet1.xml#cell:A1'].value,'個別の文字');assert.equal(parsed.fields['xl/worksheets/sheet1.xml#cell:A3'].value,'0012');assert.equal(parsed.fields['xl/worksheets/sheet1.xml#cell:A2'].value,'42');
 assert.equal(await zip.file('xl/sharedStrings.xml').async('string'),files['xl/sharedStrings.xml']);assert.match(await zip.file('xl/worksheets/sheet1.xml').async('string'),/r="A1" s="3" t="inlineStr"/);assert.match(await zip.file('xl/workbook.xml').async('string'),/fullCalcOnLoad="1"/);assert.equal(zip.file('xl/calcChain.xml'),null);assert.doesNotMatch(await zip.file('xl/_rels/workbook.xml.rels').async('string'),/calcChain/);
 await assert.rejects(exportOffice(model,{'xl/worksheets/sheet1.xml#cell:D1':'=A2'},{Zip:JSZip}),/配列/);await assert.rejects(exportOffice(model,{'other.xml#cell:A1':'attack'},{Zip:JSZip}),/存在/);
});
test('unsupported formats, oversized ZIP expansion and invalid cell addresses are rejected',async()=>{
 assert.throws(()=>officeExtension('macro.xlsm'),/未対応/);assert.equal(parseCellAddress('XFD1048576').row,1048576);assert.equal(parseCellAddress('XFE1'),null);assert.equal(parseCellAddress('A0'),null);
 assert.throws(()=>checkOfficeZip(new Uint8Array([1,2,3])),/読み込めません/);
 const original=await bytes({'word/document.xml':`<w:document xmlns:w="${W}"><w:t>hello</w:t></w:document>`}),view=new DataView(original.buffer);let found=false;for(let i=0;i<original.length-46;i++)if(view.getUint32(i,true)===0x02014b50){view.setUint32(i+24,101*1024*1024,true);found=true;break;}assert.ok(found);assert.throws(()=>checkOfficeZip(original),/大きすぎ/);
});
