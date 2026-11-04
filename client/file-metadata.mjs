import {unzipSync,strFromU8} from 'fflate';
const clean=value=>String(value||'').replace(/[\u0000-\u001f]/g,' ').replace(/\s+/g,' ').trim();
const generic=value=>/^(?:untitled|document\d*|scan\d*|microsoft word.*|adobe.*|new document|unknown|title)$/i.test(clean(value));
export function filenameDetails(name){
 const stem=String(name).replace(/\.[^.]+$/,'').replace(/[_]+/g,' ').replace(/\b(?:z-lib\.org|zlibrary|libgen|oceanofpdf)\b/gi,'').replace(/^\d{1,3}[.\s_-]+/,'').replace(/\s+/g,' ').trim();
 const split=stem.split(/\s+[–—-]\s+/);let title=stem,author='',filenameAlternative;
 if(split.length===2&&split[0].length<100&&split[1].length>2){author=split[0];title=split[1];filenameAlternative={title:split[0],author:split[1]};}
 return {title:title.slice(0,200)||'Untitled document',author:author.slice(0,200),year:'',language:'',genre:'',type:'Other',isbn:'',metadataStatus:'filename',filenameAlternative};
}
export function validISBN(value){
 const v=String(value||'').replace(/[^0-9Xx]/g,'');
 if(/^\d{13}$/.test(v)){const sum=[...v].reduce((s,n,i)=>s+Number(n)*(i%2?3:1),0);return sum%10===0?v:'';}
 if(/^\d{9}[\dXx]$/.test(v)){const sum=[...v.toUpperCase()].reduce((s,n,i)=>s+(n==='X'?10:Number(n))*(10-i),0);return sum%11===0?v:'';}
 return '';
}
function findISBN(text){for(const m of String(text).matchAll(/(?:ISBN(?:-1[03])?\s*[:=]?\s*)?((?:97[89][\s-]?)?\d[\d\s-]{7,20}[\dXx])/g)){const isbn=validISBN(m[1]);if(isbn)return isbn;}return '';}
function xml(text){if(/<!ENTITY/i.test(text))throw Error('This file’s metadata needs review.');const doc=new DOMParser().parseFromString(text,'application/xml');if(doc.getElementsByTagName('parsererror').length)throw Error('The document metadata is unreadable.');return doc;}
function nodeText(doc,names){for(const name of names){const node=doc.getElementsByTagName(name)[0]||doc.getElementsByTagNameNS('*',name.replace(/^.*:/,''))[0];if(node&&clean(node.textContent))return clean(node.textContent);}return '';}
async function metadataZip(bytes,extension){
 let total=0;const zip=unzipSync(bytes,{filter:entry=>{
  const accept=extension==='epub'?entry.name==='META-INF/container.xml'||/\.opf$/i.test(entry.name):extension==='docx'?/^(?:docProps\/core.xml|word\/document.xml)$/.test(entry.name):/^(?:meta.xml|content.xml)$/.test(entry.name);
  if(!accept||entry.originalSize>1500000||total+entry.originalSize>2500000)return false;total+=entry.originalSize;return true;
 }});
 if(extension==='epub'){
  let opf;if(zip['META-INF/container.xml']){const container=xml(strFromU8(zip['META-INF/container.xml']));const node=container.getElementsByTagNameNS('*','rootfile')[0];opf=node?.getAttribute('full-path');}
  opf=zip[opf]?opf:Object.keys(zip).find(k=>/\.opf$/i.test(k));const file=zip[opf];if(!file)throw Error('No readable ebook metadata found.');const doc=xml(strFromU8(file));
  const identifiers=[...doc.getElementsByTagNameNS('*','identifier')].map(n=>n.textContent);const dates=nodeText(doc,['dc:date','date']);
  let coverBlob;try{
   const coverId=[...doc.getElementsByTagNameNS('*','meta')].find(n=>n.getAttribute('name')==='cover')?.getAttribute('content');
   const cover=[...doc.getElementsByTagNameNS('*','item')].find(n=>/\bcover-image\b/.test(n.getAttribute('properties')||'')||coverId&&n.getAttribute('id')===coverId);
   if(cover){const target=decodeURIComponent(new URL(cover.getAttribute('href'),new URL(opf,'https://ebook.local/')).pathname.slice(1));const images=unzipSync(bytes,{filter:e=>e.name===target&&e.originalSize<3000000});if(images[target])coverBlob=await imagePreview(new Blob([images[target]],{type:cover.getAttribute('media-type')||'image/jpeg'}));}
  }catch{}
  let textBytes=0,chapters=0;const pages=unzipSync(bytes,{filter:e=>/\.(?:xhtml|html|htm)$/i.test(e.name)&&e.originalSize<500000&&chapters++<8&&(textBytes+=e.originalSize)<2000000});const contentText=Object.values(pages).map(v=>{try{return xml(strFromU8(v)).documentElement.textContent;}catch{return '';}}).join(' ').replace(/\s+/g,' ').slice(0,50000);
  return {description:nodeText(doc,['dc:description','description']).replace(/<[^>]*>/g,' ').slice(0,5000),contentText,coverBlob,title:nodeText(doc,['dc:title','title']),author:[...doc.getElementsByTagNameNS('*','creator')].map(n=>clean(n.textContent)).filter(Boolean).join(', '),language:nodeText(doc,['dc:language','language']),year:dates.match(/\b(?:18|19|20)\d{2}\b/)?.[0]||'',isbn:identifiers.map(validISBN).find(Boolean)||'',genre:nodeText(doc,['dc:subject','subject'])};
 }
 const key=extension==='docx'?'docProps/core.xml':'meta.xml';if(!zip[key])throw Error('No embedded document details found.');const doc=xml(strFromU8(zip[key]));
 const body=zip[extension==='docx'?'word/document.xml':'content.xml'];const text=body?xml(strFromU8(body)).documentElement.textContent.slice(0,50000):'';
 return {description:nodeText(doc,['dc:description']).slice(0,5000),contentText:text,title:nodeText(doc,['dc:title']),author:nodeText(doc,['dc:creator','meta:initial-creator']),language:nodeText(doc,['dc:language']),genre:nodeText(doc,['dc:subject']),isbn:findISBN(text)};
}
async function pdfMetadata(file,signal){
 const pdfjs=await import('pdfjs-dist/legacy/build/pdf.mjs');pdfjs.GlobalWorkerOptions.workerSrc='/pdf.worker.mjs';let document,task;const abort=()=>{if(task)void task.destroy().catch(()=>{});};
 try{
  signal?.throwIfAborted();task=pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer()),isEvalSupported:false,disableFontFace:true,useSystemFonts:false,verbosity:0,disableAutoFetch:true,disableStream:true});signal?.addEventListener('abort',abort,{once:true});document=await task.promise;
  const {info,metadata}=await document.getMetadata();let text='';
  for(let i=1;i<=Math.min(200,document.numPages)&&text.length<50000;i++){signal?.throwIfAborted();const page=await document.getPage(i);try{const content=await page.getTextContent();text+=content.items.map(x=>x.str||'').join(' ')+'\n';}catch{}page.cleanup();}
  let coverBlob;try{const page=await document.getPage(1),initial=page.getViewport({scale:1}),scale=Math.min(320/initial.width,500/initial.height),viewport=page.getViewport({scale});const canvas=globalThis.document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);await page.render({canvasContext:canvas.getContext('2d'),viewport,background:'rgb(255,255,255)'}).promise;coverBlob=await canvasJPEG(canvas);page.cleanup();}catch{}
  const xmpTitle=metadata?.get('dc:title'),xmpAuthor=metadata?.get('dc:creator');
  return {description:clean(info.Subject).slice(0,5000),contentText:text.slice(0,50000),coverBlob,title:info.Title||(Array.isArray(xmpTitle)?xmpTitle.join(' '):xmpTitle)||'',author:info.Author||(Array.isArray(xmpAuthor)?xmpAuthor.join(', '):xmpAuthor)||'',language:info.Lang||metadata?.get('dc:language')||'',isbn:findISBN(text)};
 }finally{signal?.removeEventListener('abort',abort);try{if(document)await document.destroy();else await task?.destroy();}catch{}}
}
function textMetadata(text,extension){
 const get=key=>clean(text.match(new RegExp('^\\s*'+key+'\\s*[:=]\\s*["\']?(.+?)["\']?\\s*$','im'))?.[1]||'');
 if(extension==='fb2'){const description=text.match(/<description\b[^>]*>[\s\S]*?<\/description>/i)?.[0];const doc=xml(description?'<FictionBook>'+description+'</FictionBook>':text);const author=doc.getElementsByTagNameNS('*','author')[0];return {title:nodeText(doc,['book-title']),author:author?[...author.children].map(n=>n.textContent).join(' '):'',language:nodeText(doc,['lang']),genre:nodeText(doc,['genre']),isbn:nodeText(doc,['isbn'])};}
 return {description:get('description'),contentText:clean(text).slice(0,50000),title:get('title')||(extension==='md'?clean(text.match(/^#\s+(.+)$/m)?.[1]):''),author:get('author'),year:get('year'),language:get('language'),isbn:findISBN(text)};
}
export async function inspectFile(file,{signal}={}){
 signal?.throwIfAborted();
 const base=filenameDetails(file.name),extension=file.name.split('.').pop().toLowerCase();let found={},message='Details read from the filename.';
 try{
  if(extension==='pdf')found=await pdfMetadata(file,signal);
  else if(['epub','docx','odt'].includes(extension))found=await metadataZip(new Uint8Array(await file.arrayBuffer()),extension);
  else if(['txt','md','rtf','fb2','csv'].includes(extension))found=textMetadata(await file.slice(0,1500000).text(),extension);
  if(found.title&&!generic(found.title)){base.title=clean(found.title).slice(0,200);base.metadataStatus='file';message='Details read from the file.';}
  for(const key of ['author','genre','language','year','isbn'])if(found[key])base[key]=clean(found[key]).slice(0,key==='author'?200:key==='genre'?80:key==='language'?60:30);
 }catch(error){if(signal?.aborted)throw error;message='Embedded details could not be read. Filename details were used.';}
 signal?.throwIfAborted();if(!/^(?:18|19|20)\d{2}$/.test(base.year))base.year='';base.isbn=validISBN(base.isbn);
 const reliableTitle=!generic(base.title)&&!/^\d+$/.test(base.title)&&base.title.length>=3;
 if(!base.author||!reliableTitle)base.metadataStatus='review';
 if(/^(?:admin|user|administrator|unknown)$/i.test(base.author)){base.author='';base.metadataStatus='review';}
 return {...base,description:clean(found.description).slice(0,5000),contentText:clean(found.contentText).slice(0,50000),reliableTitle,message,coverBlob:found.coverBlob};
}

async function canvasJPEG(canvas){const blob=await new Promise(r=>canvas.toBlob(r,'image/jpeg',0.82));return blob&&blob.size<524288?blob:undefined;}
async function imagePreview(blob){if(!/^image\/(?:jpeg|png|webp|gif)$/.test(blob.type))return;const bitmap=await createImageBitmap(blob);try{const scale=Math.min(1,320/bitmap.width,500/bitmap.height),canvas=globalThis.document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));const context=canvas.getContext('2d');context.fillStyle='#ffffff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(bitmap,0,0,canvas.width,canvas.height);return await canvasJPEG(canvas);}finally{bitmap.close();}}
