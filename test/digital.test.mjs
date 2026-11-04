import {test} from 'node:test';
import assert from 'node:assert/strict';
import {startServer} from '../server.mjs';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {JSDOM} from 'jsdom';
import {zipSync,strToU8} from 'fflate';
import {inspectFile,validISBN} from '../client/file-metadata.mjs';
import {lookupBooks} from '../metadata-service.mjs';
import worker from '../worker.mjs';
const close=async app=>{await new Promise(r=>app.server.close(r));app.db.close();};
const pdf='%PDF-1.4\nA small testing document\n%%EOF';
function upload(url,{name='Author - Title.pdf',content=pdf,metadata={title:'Title',author:'Author'},thumbnail}={}){const body=new FormData();body.append('file',new Blob([content]),name);body.append('metadata',JSON.stringify(metadata));if(thumbnail)body.append('thumbnail',new Blob([thumbnail],{type:'image/jpeg'}),'cover.jpg');return fetch(url+'/api/digital-files',{method:'POST',body});}
test('bulk-upload API persists original files and private covers; skips duplicates; supports PDF ranges, edits, and deletion',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'ahmad-files-'));let app;try{
 const dbPath=join(dir,'library.sqlite');app=await startServer({port:0,dbPath});
 const created=await upload(app.url,{thumbnail:new Uint8Array([255,216,255,224,1,2,3])});assert.equal(created.status,201);const {book}=await created.json();assert.equal(book.collection,'digital');assert.equal(book.files.length,1);assert.match(book.coverUrl,/\/cover$/);
 assert.equal(await(await fetch(app.url+book.files[0].url)).text(),pdf);assert.equal((await fetch(app.url+book.files[0].url)).headers.get('content-disposition').startsWith('inline'),true);
 const range=await fetch(app.url+book.files[0].url,{headers:{Range:'bytes=0-4'}});assert.equal(range.status,206);assert.equal(await range.text(),'%PDF-');assert.match(range.headers.get('content-range'),/^bytes 0-4\//);
 assert.equal((await fetch(app.url+book.files[0].url,{headers:{Range:'bytes=99999-'}})).status,416);
 assert.match((await fetch(app.url+book.files[0].downloadUrl)).headers.get('content-disposition'),/^attachment/);
 assert.deepEqual([...new Uint8Array(await(await fetch(app.url+book.coverUrl)).arrayBuffer())],[255,216,255,224,1,2,3]);
 const duplicate=await upload(app.url,{name:'Renamed.pdf',metadata:{title:'Do not overwrite',author:'Different'}});assert.equal(duplicate.status,200);assert.equal((await duplicate.json()).duplicate,true);
 const edit=await fetch(app.url+'/api/books/'+book.id,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({...book,title:'Edited title',collection:'physical'})});const updated=await edit.json();assert.equal(updated.collection,'digital');assert.equal(updated.files.length,1);
 await close(app);app=null;app=await startServer({port:0,dbPath});assert.equal(await(await fetch(app.url+book.files[0].url)).text(),pdf);assert.equal((await(await fetch(app.url+'/api/books')).json()).length,1);
 assert.equal((await upload(app.url,{name:'Bad.pdf',content:'Not a PDF'})).status,415);assert.equal((await upload(app.url,{name:'Bad.html',content:'<script>bad</script>'})).status,415);
 const crossOrigin=new FormData();crossOrigin.append('file',new Blob(['test']),'test.txt');assert.equal((await fetch(app.url+'/api/digital-files',{method:'POST',headers:{Origin:'https://evil.example'},body:crossOrigin})).status,403);
 const secretEnv={APP_PASSWORD:'secret',BUCKET:{},DB:{}};assert.equal((await worker.fetch(new Request('https://example.test'+book.files[0].url),secretEnv)).status,401);
 await fetch(app.url+'/api/books/'+book.id,{method:'DELETE',headers:{'Content-Type':'application/json'},body:'{}'});assert.equal((await fetch(app.url+book.files[0].url)).status,404);assert.equal((await fetch(app.url+book.coverUrl)).status,404);
 assert.deepEqual(await(await fetch(app.url+'/api/books')).json(),[]);
 }finally{if(app)await close(app);await rm(dir,{recursive:true,force:true});}
});
test('document parser reads EPUB, DOCX and text metadata with filename fallback',async()=>{
 const dom=new JSDOM('');globalThis.DOMParser=dom.window.DOMParser;try{
 const text=await inspectFile(new File(['Title: A Real Title\nAuthor: A Real Author\nYear: 2020\nISBN: 9780140328721'],'Download.txt'));assert.equal(text.title,'A Real Title');assert.equal(text.author,'A Real Author');assert.equal(text.isbn,'9780140328721');assert.equal(text.metadataStatus,'file');
 const epub=zipSync({'META-INF/container.xml':strToU8('<container><rootfiles><rootfile full-path="OEBPS/content.opf"/></rootfiles></container>'),'OEBPS/content.opf':strToU8('<package xmlns:dc="http://purl.org/dc/elements/1.1/"><metadata><dc:title>EPUB title</dc:title><dc:creator>EPUB author</dc:creator><dc:language>az</dc:language><dc:date>2021-01-02</dc:date></metadata></package>')});const ebook=await inspectFile(new File([epub],'random.epub'));assert.equal(ebook.title,'EPUB title');assert.equal(ebook.author,'EPUB author');assert.equal(ebook.year,'2021');
 const docx=zipSync({'docProps/core.xml':strToU8('<core xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>My document</dc:title><dc:creator>Ahmad</dc:creator></core>')});assert.equal((await inspectFile(new File([docx],'old.docx'))).author,'Ahmad');
 const fallback=await inspectFile(new File(['bad'],'Richard Feynman - Physics.pdf'));assert.equal(fallback.title,'Physics');assert.equal(fallback.author,'Richard Feynman');assert.equal(fallback.coverBlob,undefined);
 assert.equal(validISBN('9780140328722'),'');assert.equal(validISBN('0-14-032872-6'),'0140328726');
 }finally{dom.window.close();delete globalThis.DOMParser;}
});
test('metadata lookup recommends clear titles and ISBNs but leaves conflicting authors for review',async()=>{
 const catalogue=docs=>async url=>Response.json(String(url).includes('alinino')?[]:{docs});
 const item=(author,isbn='9780140328721')=>({key:'/works/OL123W',title:'A unique test title',author_name:[author],cover_i:1,language:['eng'],first_publish_year:2020,isbn:[isbn],subject:['Physics']});
 let data=await lookupBooks({title:'A unique test title'},catalogue([item('A Writer')]));assert.equal(data.recommendedIndex,0);assert.equal(data.results[0].genre,'Physics');assert.equal(data.results[0].language,'English');
 data=await lookupBooks({title:'A unique test title'},catalogue([item('A Writer'),{...item('Another Writer'),cover_i:2,key:'/works/OL124W'}]));assert.equal(data.recommendedIndex,-1);
 data=await lookupBooks({title:'A unique test title',author:'Unrelated author'},catalogue([item('A Writer')]));assert.equal(data.recommendedIndex,-1);
 data=await lookupBooks({title:'',isbn:'9780140328721'},catalogue([item('A Writer')]));assert.equal(data.recommendedIndex,0);
});
