import {test} from 'node:test';
import assert from 'node:assert/strict';
import {exportLibraryCSV,parseLibraryCSV,prepareCSVBook} from '../csv-library.mjs';
import {startServer} from '../server.mjs';
const fixture={id:'portable-book',createdAt:'2026-10-03T09:12:00.000Z',title:'Əli, "Nino" və kitab',author:'Əhməd',isbn:'0123456789',publisher:'Nəşriyyat',year:'2020',pages:'140',language:'Azərbaycan dili',genre:'Ədəbiyyat',type:'Fiction',collection:'physical',reading:'Reading',location:'Üst rəf',description:'Birinci sətir\nİkinci, "sətir".',notes:'=HYPERLINK("https://evil.test")\nşəxsi qeyd',contentText:"'literal\nçoxsətirli mətn",borrower:'Nəclə',loanedAt:'2026-11-01',dueDate:'2026-11-20',color:'wine',coverUrl:'https://covers.openlibrary.org/b/id/123-M.jpg',coverSource:'https://openlibrary.org/books/OL123M',files:[{name:'özəl sənəd.pdf',size:12,mime:'application/pdf'}]};
test('CSV round-trip preserves Unicode, leading ISBN zeroes, quotes, multiline notes, categories and dates with spreadsheet protection',()=>{
 const csv=exportLibraryCSV([fixture],['Ədəbiyyat','Boş kateqoriya']);assert.ok(csv.startsWith('\uFEFF'));assert.ok(csv.includes("'=HYPERLINK"));assert.ok(!csv.includes('owner_id'));
 const result=parseLibraryCSV(csv);assert.deepEqual(result.errors,[]);assert.deepEqual(result.categories,['Ədəbiyyat','Boş kateqoriya']);assert.equal(result.attachments,1);
 for(const key of ['id','createdAt','title','author','isbn','description','notes','contentText','borrower','loanedAt','dueDate','reading','collection','coverUrl','coverSource'])assert.equal(result.books[0][key],fixture[key],key);
 assert.deepEqual(parseLibraryCSV(exportLibraryCSV([],['Boş rəf'])).categories,['Boş rəf']);
 const values=["'literal",'  =sum(1,2)','+command','-note','@formula','\tleading'];for(const notes of values)assert.equal(parseLibraryCSV(exportLibraryCSV([{...fixture,notes}],[])).books[0].notes,notes.trim());
});
test('CSV imports common localized columns and separators, reports invalid rows, and drops nonportable/private covers',()=>{
 const parsed=parseLibraryCSV('Kitabın adı;Müəllif;Kateqoriya;format;oxu vəziyyəti\r\n"Əsər; bir";Əli;Tarix;rəqəmsal;Oxunub\r\n;Yazar;;physical;Unread');assert.equal(parsed.books.length,1);assert.equal(parsed.books[0].title,'Əsər; bir');assert.equal(parsed.books[0].collection,'digital');assert.equal(parsed.books[0].reading,'Read');assert.equal(parsed.errors[0].line,3);
 assert.equal(parseLibraryCSV('Title\tAuthor\tExclusive Shelf\nStory\tWriter\tto-read').books[0].reading,'Unread');
 assert.throws(()=>parseLibraryCSV('title,title\na,b'),/yinelenen/);assert.throws(()=>parseLibraryCSV('author\na'),/title/);assert.throws(()=>parseLibraryCSV('title\n"unclosed'),/tırnak/);
 const cover=prepareCSVBook({...fixture,coverUrl:'/api/book-photos/somebody',photoKey:'secret',owner_id:'victim'});assert.equal(cover.book.coverUrl,'');assert.equal(cover.missingCover,true);assert.equal(cover.book.photoKey,undefined);assert.equal(cover.book.owner_id,undefined);
});
async function setup(bindings={}){const app=await startServer({port:0,dbPath:':memory:',bindings,testIdentityResolver:r=>{const name=r.headers.get('x-test-user');return name?{provider:'test',subject:name,name,email:name+'@example.test',emailVerified:true}:null;}});const call=async(name,path,method='GET',body)=>{const response=await fetch(app.url+'/api/'+path,{method,headers:{...(name?{'x-test-user':name}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});return {response,data:response.headers.get('content-type')?.includes('json')?await response.json():await response.text()};};return {app,call,close:async()=>{await new Promise(r=>app.server.close(r));app.db.close();}};}
test('CSV export/import is private, restores all book fields and empty categories, and is idempotent without overwriting',async()=>{
 const c=await setup();try{const {call}=c;assert.equal((await call(null,'account/export.csv')).response.status,401);for(const name of ['alice','bob'])await call(name,'account/create','POST',{displayName:name});
 const added=await call('alice','books','POST',fixture);await call('alice','categories','POST',{name:'Boş rəf'});const exported=await call('alice','account/export.csv');assert.equal(exported.response.status,200);assert.match(exported.response.headers.get('content-disposition'),/attachment/);assert.match(exported.response.headers.get('cache-control'),/no-store/);assert.equal(parseLibraryCSV((await call('bob','account/export.csv')).data).books.length,0);
 const parsed=parseLibraryCSV(exported.data),payload={books:parsed.books,categories:parsed.categories};const first=await call('bob','account/import-csv','POST',payload);assert.equal(first.data.added,1);const owned=(await call('bob','books')).data;assert.equal(owned[0].id,added.data.id);assert.equal(owned[0].notes,fixture.notes);assert.equal(owned[0].borrower,fixture.borrower);assert.ok((await call('bob','categories')).data.some(c=>c.name==='Boş rəf'));
 const repeat=await call('bob','account/import-csv','POST',{...payload,books:[{...payload.books[0],title:'Do not overwrite'}]});assert.equal(repeat.data.added,0);assert.equal(repeat.data.skipped,1);assert.equal((await call('bob','books')).data[0].title,fixture.title);assert.equal((await call('alice','books')).data[0].title,fixture.title);
 }finally{await c.close();}
});
test('CSV validates the complete batch before writing; generated IDs allow safe retry and quota limits are enforced',async()=>{
 const c=await setup({MAX_USER_BOOKS:'2'});try{const {call}=c;await call('alice','account/create','POST',{displayName:'alice'});const make=title=>({title,reading:'Unread',collection:'physical'});
 const invalid=await call('alice','account/import-csv','POST',{books:[make('Valid'),make('')],categories:[]});assert.equal(invalid.response.status,400);assert.equal((await call('alice','books')).data.length,0);
 const payload={books:[make('One'),make('Two'),make('Three')],categories:[]};const first=await call('alice','account/import-csv','POST',payload);assert.equal(first.data.added,2);assert.equal(first.data.limited.length,1);const repeat=await call('alice','account/import-csv','POST',payload);assert.equal(repeat.data.skipped,2);assert.equal(repeat.data.limited.length,1);assert.equal((await call('alice','books')).data.length,2);
 }finally{await c.close();}
});
