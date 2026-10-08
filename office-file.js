const W='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const A='http://schemas.openxmlformats.org/drawingml/2006/main';
const S='http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const R='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const nsNodes=(node,ns,name)=>Array.from(node.getElementsByTagNameNS(ns,name));
const xml=(source)=>{
 if(/<!DOCTYPE|<!ENTITY/i.test(source))throw Error('このXML形式には対応していません');
 const doc=new DOMParser().parseFromString(source,'application/xml');
 if(doc.getElementsByTagName('parsererror').length)throw Error('ファイル内のXMLを読み込めません');return doc;
};
export const officeMime={docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',pptx:'application/vnd.openxmlformats-officedocument.presentationml.presentation'};
export function officeExtension(name){const ext=String(name).split('.').pop().toLowerCase();if(!officeMime[ext])throw Error('.docx・.xlsx・.pptxファイルを選択してください（旧形式・マクロ付き・暗号化ファイルは未対応）');return ext;}
// Check the ZIP directory before inflating any XML or embedded media.
export function checkOfficeZip(bytes){
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);let end=-1;
 for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--)if(view.getUint32(i,true)===0x06054b50){end=i;break;}
 if(end<0)throw Error('Officeファイルを読み込めません。暗号化・破損・旧形式の可能性があります');
 const count=view.getUint16(end+10,true),size=view.getUint32(end+12,true),offset=view.getUint32(end+16,true);
 if(view.getUint16(end+4,true)||view.getUint16(end+6,true)||count===65535||count>10000||offset+size>end)throw Error('このZIP構造には対応していません');
 let pos=offset,total=0;
 for(let i=0;i<count;i++){
  if(pos+46>end||view.getUint32(pos,true)!==0x02014b50)throw Error('ファイルのZIP構造が不正です');
  const unpacked=view.getUint32(pos+24,true);total+=unpacked;
  if(unpacked>40*1024*1024||total>100*1024*1024)throw Error('展開後のファイルが大きすぎます（合計100MBまで）');
  if(view.getUint16(pos+8,true)&1)throw Error('パスワード付きファイルは未対応です');
  pos+=46+view.getUint16(pos+28,true)+view.getUint16(pos+30,true)+view.getUint16(pos+32,true);
 }
 if(pos>offset+size)throw Error('ファイルのZIP構造が不正です');
}
export function columnNumber(name){let n=0;for(const c of name)n=n*26+c.charCodeAt(0)-64;return n;}
export function columnName(n){let result='';while(n>0){n--;result=String.fromCharCode(65+n%26)+result;n=Math.floor(n/26);}return result;}
export function parseCellAddress(address){const m=/^([A-Z]{1,3})([1-9]\d{0,6})$/.exec(String(address).toUpperCase());if(!m)return null;const col=columnNumber(m[1]),row=Number(m[2]);return col<=16384&&row<=1048576?{col,row,address:m[1]+row}:null;}
function relatedPath(base,target){
 const parts=target.startsWith('/')?[]:base.split('/').slice(0,-1);
 for(const part of target.replace(/^\//,'').split('/')){if(part==='..')parts.pop();else if(part&&part!=='.')parts.push(part);}return parts.join('/');
}
async function relationships(zip,path){const file=zip.file(path);if(!file)return {};const doc=xml(await file.async('string'));return Object.fromEntries(Array.from(doc.getElementsByTagName('Relationship')).filter(n=>n.getAttribute('TargetMode')!=='External').map(n=>[n.getAttribute('Id'),n.getAttribute('Target')]));}
export async function readOffice(bytes,name,{Zip=globalThis.JSZip}={}){
 if(!Zip)throw Error('ファイル読込ライブラリを読み込めません');const ext=officeExtension(name);
 bytes=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes);if(bytes.length>20*1024*1024)throw Error('1ファイル20MBまで読み込めます');checkOfficeZip(bytes);
 const zip=await Zip.loadAsync(bytes),fields={},sections=[],docs=new Map();
 const load=async path=>{if(docs.has(path))return docs.get(path);const file=zip.file(path);if(!file)throw Error('必要なOfficeデータがありません: '+path);const doc=xml(await file.async('string'));docs.set(path,doc);return doc;};
 const textSection=async(path,label,ns)=>{
  const doc=await load(path),keys=[];nsNodes(doc,ns,'t').forEach((node,index)=>{const key=path+'#t'+index;fields[key]={key,path,index,type:'text',value:node.textContent||'',label:'文字 '+(index+1)};keys.push(key);});sections.push({path,label,keys});
 };
 if(ext==='docx')await textSection('word/document.xml','本文',W);
 else if(ext==='pptx'){
  const doc=await load('ppt/presentation.xml'),rels=await relationships(zip,'ppt/_rels/presentation.xml.rels');
  const ids=nsNodes(doc,'http://schemas.openxmlformats.org/presentationml/2006/main','sldId');
  for(const [i,n] of ids.entries()){const target=rels[n.getAttributeNS(R,'id')];if(!target)throw Error('スライドの参照を読み込めません');await textSection(relatedPath('ppt/presentation.xml',target),'スライド '+(i+1),A);}
 }else{
  const workbook=await load('xl/workbook.xml'),rels=await relationships(zip,'xl/_rels/workbook.xml.rels');
  const sharedFile=zip.file('xl/sharedStrings.xml'),shared=sharedFile?nsNodes(xml(await sharedFile.async('string')),S,'si').map(n=>nsNodes(n,S,'t').map(t=>t.textContent).join('')):[];
  for(const sheet of nsNodes(workbook,S,'sheet')){
   const target=rels[sheet.getAttributeNS(R,'id')];if(!target)throw Error('シートの参照を読み込めません');const path=relatedPath('xl/workbook.xml',target),doc=await load(path),keys=[];
   for(const cell of nsNodes(doc,S,'c')){const address=cell.getAttribute('r');if(!parseCellAddress(address))continue;const key=path+'#cell:'+address,t=cell.getAttribute('t'),f=nsNodes(cell,S,'f')[0],v=nsNodes(cell,S,'v')[0]?.textContent||'';
    const value=f?'='+f.textContent:t==='s'?shared[Number(v)]??'':t==='inlineStr'?nsNodes(cell,S,'t').map(n=>n.textContent).join(''):v;
    fields[key]={key,path,address,type:'cell',value,label:address,locked:!!f&&['shared','array','dataTable'].includes(f.getAttribute('t'))};keys.push(key);
   }
   sections.push({path,label:sheet.getAttribute('name'),keys});
  }
 }
 if(Object.keys(fields).length>20000)throw Error('このファイルは編集対象が多すぎます（20,000項目まで）');
 return {ext,name,zip,docs,fields,sections,bytes};
}
export function fieldValue(model,key,changes={}){return Object.hasOwn(changes,key)?changes[key]:model.fields[key]?.value||'';}
function insertCell(doc,address){
 let cell=nsNodes(doc,S,'c').find(n=>n.getAttribute('r')===address);if(cell)return cell;
 const position=parseCellAddress(address);if(!position)throw Error('セルの位置が不正です');
 const data=nsNodes(doc,S,'sheetData')[0];if(!data)throw Error('シートの構造が未対応です');
 let row=nsNodes(data,S,'row').find(n=>Number(n.getAttribute('r'))===position.row);
 if(!row){row=doc.createElementNS(S,'row');row.setAttribute('r',String(position.row));const next=nsNodes(data,S,'row').find(n=>Number(n.getAttribute('r'))>position.row);data.insertBefore(row,next||null);}
 cell=doc.createElementNS(S,'c');cell.setAttribute('r',address);const next=nsNodes(row,S,'c').find(n=>parseCellAddress(n.getAttribute('r'))?.col>position.col);row.insertBefore(cell,next||null);return cell;
}
function setCell(doc,address,value){
 const cell=insertCell(doc,address),oldFormula=nsNodes(cell,S,'f')[0];
 if(oldFormula&&['shared','array','dataTable'].includes(oldFormula.getAttribute('t')))throw Error(address+'は配列・共有数式のため編集できません');
 for(const node of Array.from(cell.childNodes))if(node.nodeType===1&&['f','v','is'].includes(node.localName))cell.removeChild(node);
 cell.removeAttribute('t');
 const add=(name,text)=>{const node=doc.createElementNS(S,name);node.textContent=text;cell.insertBefore(node,Array.from(cell.childNodes).find(n=>n.nodeType===1&&n.localName==='extLst')||null);return node;};
 if(value.startsWith('=')&&value.length>1)add('f',value.slice(1));
 else if(/^[+-]?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(value))add('v',value);
 else if(value!==''){cell.setAttribute('t','inlineStr');const is=add('is',''),t=doc.createElementNS(S,'t');t.setAttributeNS('http://www.w3.org/XML/1998/namespace','xml:space','preserve');t.textContent=value;is.appendChild(t);}
}
export async function exportOffice(model,changes,{Zip=globalThis.JSZip}={}){
 // Work on a fresh archive so repeat exports do not change the source model.
 const copy=await readOffice(model.bytes,model.name,{Zip}),touched=new Set();
 for(const [key,value] of Object.entries(changes)){
  if(typeof value!=='string'||value.length>10000)throw Error('編集内容が不正です');
  const field=copy.fields[key],match=/^(.*)#cell:([A-Z]+[1-9]\d*)$/.exec(key);
  if(field?.type==='text'){
   const doc=copy.docs.get(field.path),node=nsNodes(doc,copy.ext==='docx'?W:A,'t')[field.index];if(!node)throw Error('編集対象の文字が見つかりません');
   node.textContent=value;node.setAttributeNS('http://www.w3.org/XML/1998/namespace','xml:space','preserve');touched.add(field.path);
  }else if(copy.ext==='xlsx'&&match&&copy.sections.some(s=>s.path===match[1])){setCell(copy.docs.get(match[1]),match[2],value);touched.add(match[1]);const d=nsNodes(copy.docs.get(match[1]),S,'dimension')[0];if(d)d.parentNode.removeChild(d);}
  else throw Error('編集対象がファイルに存在しません');
 }
 if(copy.ext==='xlsx'&&touched.size){
  const doc=copy.docs.get('xl/workbook.xml');let calc=nsNodes(doc,S,'calcPr')[0];if(!calc){calc=doc.createElementNS(S,'calcPr');doc.documentElement.insertBefore(calc,Array.from(doc.documentElement.childNodes).find(n=>n.nodeType===1&&['oleSize','customWorkbookViews','pivotCaches','smartTagPr','smartTagTypes','webPublishing','fileRecoveryPr','webPublishObjects','extLst'].includes(n.localName))||null);}calc.setAttribute('fullCalcOnLoad','1');calc.setAttribute('forceFullCalc','1');calc.setAttribute('calcMode','auto');touched.add('xl/workbook.xml');
  copy.zip.remove('xl/calcChain.xml');
  for(const [path,tag,attribute,value] of [['xl/_rels/workbook.xml.rels','Relationship','Type','/calcChain'],['[Content_Types].xml','Override','PartName','/xl/calcChain.xml']]){
   const f=copy.zip.file(path);if(!f)continue;const d=xml(await f.async('string'));for(const n of Array.from(d.getElementsByTagName(tag)))if(n.getAttribute(attribute)?.endsWith(value))n.parentNode.removeChild(n);copy.zip.file(path,new XMLSerializer().serializeToString(d));
  }
 }
 for(const path of touched)copy.zip.file(path,new XMLSerializer().serializeToString(copy.docs.get(path)));
 return copy.zip.generateAsync({type:'uint8array',compression:'DEFLATE',compressionOptions:{level:6}});
}
