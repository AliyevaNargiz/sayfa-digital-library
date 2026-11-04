import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {startServer,databaseAdapter} from '../server.mjs';
import worker from '../worker.mjs';
import {DatabaseSync} from 'node:sqlite';
import {readFile} from 'node:fs/promises';
let app;
before(async()=>{app=await startServer({port:0,dbPath:':memory:'});});
after(async()=>{await new Promise(r=>app.server.close(r));app.db.close();});
const book={title:'A Room of One’s Own',author:'Virginia Woolf',genre:'Essays',type:'Non-fiction',reading:'Unread',color:'ink',year:'1929',language:'English',location:'Study',isbn:'',notes:'A treasured copy.',borrower:'',loanedAt:'',dueDate:''};
async function api(path,method='GET',body){const r=await fetch(app.url+'/api/'+path,{method,...(body!==undefined?{headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json()};}
test('book creation, lending, returning, editing, backup and deletion persist in SQLite',async()=>{
 assert.deepEqual((await api('books')).data,[]);
 const created=await api('books','POST',book);assert.equal(created.status,201);const id=created.data.id;
 assert.equal((await api('books')).data[0].title,book.title);
 assert.equal(JSON.parse(app.db.prepare('SELECT data FROM books WHERE id = ?').get(id).data).notes,book.notes);
 const loan=await api('books/'+id,'PUT',{...book,borrower:'Alex',loanedAt:'2026-01-01',dueDate:'2026-01-15'});assert.equal(loan.data.borrower,'Alex');
 const invalid=await api('books/'+id,'PUT',{...book,borrower:'Alex',loanedAt:'2026-01-15',dueDate:'2026-01-01'});assert.equal(invalid.status,400);
 const returned=await api('books/'+id,'PUT',{...book,reading:'Read',borrower:'',loanedAt:'',dueDate:''});assert.equal(returned.data.reading,'Read');assert.equal(returned.data.borrower,'');
 const backup={app:'Necle’nin Kütüphanesi',version:1,books:(await api('books')).data};
 assert.equal((await api('import','POST',backup)).status,200);assert.equal((await api('books')).data.length,1);
 assert.equal((await api('books/'+id,'DELETE',{})).status,200);assert.deepEqual((await api('books')).data,[]);
 assert.equal((await api('import','POST',backup)).status,200);assert.equal((await api('books')).data[0].id,id);
 assert.equal((await api('books/unknown','PUT',book)).status,404);
});
test('invalid writes are rejected without inserting books',async()=>{
 const count=(await api('books')).data.length;
 for(const bad of [{...book,title:''},{...book,reading:'Unknown'},{...book,year:'cats'},{...book,dueDate:'2026-12-01'},{...book,title:'x'.repeat(201)}])assert.equal((await api('books','POST',bad)).status,400);
 assert.equal((await api('books')).data.length,count);
 const response=await fetch(app.url+'/api/books',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://evil.example'},body:JSON.stringify(book)});assert.equal(response.status,403);
 const badImport=await api('import','POST',{app:'Necle’nin Kütüphanesi',version:1,books:[{...book,id:'good',createdAt:'2026-01-01'}, {...book,id:'bad',createdAt:'invalid'}]});assert.equal(badImport.status,400);assert.equal((await api('books')).data.length,count);
});
test('static assets have content types and security headers',async()=>{for(const path of ['/','/app.js','/style.css']){const r=await fetch(app.url+path);assert.equal(r.status,200);assert.equal(r.headers.get('x-content-type-options'),'nosniff');assert.match(r.headers.get('content-security-policy'),/frame-ancestors 'none'/);}assert.equal((await fetch(app.url+'/missing')).status,404);});
test('cloud API requires a password, signs sessions, logs out and rate limits login',async()=>{
 const db=new DatabaseSync(':memory:');db.exec(await readFile(new URL('../migrations/0001_library.sql',import.meta.url),'utf8'));
 const env={DB:databaseAdapter(db),APP_PASSWORD:'correct horse battery staple'};
 const req=(path,method='GET',data,headers={})=>new Request('https://library.example/api/'+path,{method,headers:{'Content-Type':'application/json',...headers},...(data?{body:JSON.stringify(data)}:{})});
 assert.equal((await worker.fetch(req('books'),env)).status,401);
 assert.equal((await worker.fetch(req('session'),{DB:env.DB})).status,503);
 assert.equal((await worker.fetch(req('login','POST',{password:'wrong'}),env)).status,401);
 const login=await worker.fetch(req('login','POST',{password:env.APP_PASSWORD}),env);assert.equal(login.status,200);const cookie=login.headers.get('set-cookie');assert.match(cookie,/HttpOnly/);assert.match(cookie,/Secure/);
 assert.equal((await worker.fetch(req('books','GET',null,{cookie}),env)).status,200);
 assert.equal((await worker.fetch(req('books','GET',null,{cookie:cookie.replace(/session=./,'session=x')}),env)).status,401);
 const logout=await worker.fetch(req('logout','POST',{}, {cookie}),env);assert.match(logout.headers.get('set-cookie'),/Max-Age=0/);
 for(let i=0;i<10;i++)assert.equal((await worker.fetch(req('login','POST',{password:'bad'},{'cf-connecting-ip':'1.2.3.4'}),env)).status,401);
 assert.equal((await worker.fetch(req('login','POST',{password:env.APP_PASSWORD},{'cf-connecting-ip':'1.2.3.4'}),env)).status,429);
 db.close();
});
test('local books survive stopping and restarting the server',async()=>{
 const {mkdtemp,rm}=await import('node:fs/promises');const {tmpdir}=await import('node:os');const {join}=await import('node:path');
 const dir=await mkdtemp(join(tmpdir(),'stillroom-test-'));let instance;
 try{const dbPath=join(dir,'library.sqlite');instance=await startServer({port:0,dbPath});
 const r=await fetch(instance.url+'/api/books',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(book)});assert.equal(r.status,201);
 await new Promise(r=>instance.server.close(r));instance.db.close();instance=null;
 instance=await startServer({port:0,dbPath});const saved=await(await fetch(instance.url+'/api/books')).json();assert.equal(saved.length,1);assert.equal(saved[0].title,book.title);
 }finally{if(instance){await new Promise(r=>instance.server.close(r));instance.db.close();}await rm(dir,{recursive:true,force:true});}
});
