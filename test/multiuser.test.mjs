import {test} from 'node:test';
import assert from 'node:assert/strict';
import {startServer,databaseAdapter} from '../server.mjs';
import {verifyFirebaseToken} from '../identity-service.mjs';
import {DatabaseSync} from 'node:sqlite';
import {readFile,readdir} from 'node:fs/promises';
import {localBucket} from '../local-bucket.mjs';
import worker from '../worker.mjs';
const identity=name=>({provider:'test',subject:name,email:name+'@example.test',emailVerified:true,name});
const close=async app=>{await new Promise(r=>app.server.close(r));app.db.close();};
async function start(bindings={}){return startServer({port:0,dbPath:':memory:',bindings:{APP_OWNER_EMAIL:'admin@example.test',...bindings},testIdentityResolver:req=>{const name=req.headers.get('x-test-user');return name?identity(name):null;}});}
async function call(app,name,path,method='GET',data){const response=await fetch(app.url+'/api/'+path,{method,headers:{...(name?{'x-test-user':name}:{}),...(data===undefined?{}:{'Content-Type':'application/json'})},...(data===undefined?{}:{body:JSON.stringify(data)})});return {status:response.status,data:await response.json()};}
const register=(app,name)=>call(app,name,'account/create','POST',{displayName:name});
const book=(title,extra={})=>({title,author:'Bir yazar',reading:'Unread',...extra});
async function upload(app,name,content='Shared document bytes'){const form=new FormData();form.append('file',new Blob([content]),'paper.txt');form.append('metadata',JSON.stringify({title:name+' document'}));const response=await fetch(app.url+'/api/digital-files',{method:'POST',headers:{'x-test-user':name},body:form});return {status:response.status,data:await response.json()};}
test('users have isolated books, categories, duplicate-file detection, downloads, and deletion',async()=>{
 const app=await start();try{
 assert.equal((await call(app,null,'books')).status,401);assert.equal((await call(app,'alice','books')).status,403);await register(app,'alice');await register(app,'bob');
 const alice=(await call(app,'alice','books','POST',book('Alice private',{genre:'Roman'}))).data;
 assert.deepEqual((await call(app,'bob','books')).data,[]);assert.equal((await call(app,'bob','books/'+alice.id,'PUT',book('Stolen'))).status,404);assert.equal((await call(app,'bob','books/'+alice.id,'DELETE',{})).status,404);
 const aCategory=await call(app,'alice','categories','POST',{name:'Roman'}),bCategory=await call(app,'bob','categories','POST',{name:'Roman'});assert.equal(aCategory.status,201);assert.equal(bCategory.status,201);assert.equal((await call(app,'bob','categories/'+aCategory.data.id,'PUT',{name:'Hijacked'})).status,404);
 await call(app,'bob','categories/'+bCategory.data.id,'PUT',{name:'Bob only'});assert.equal((await call(app,'alice','books')).data[0].genre,'Roman');
 const a=await upload(app,'alice'),b=await upload(app,'bob');assert.equal(a.status,201);assert.equal(b.status,201);assert.equal(a.data.duplicate,false);assert.equal(b.data.duplicate,false);assert.notEqual(a.data.book.files[0].id,b.data.book.files[0].id);assert.equal((await upload(app,'alice')).data.duplicate,true);
 assert.equal((await fetch(app.url+a.data.book.files[0].url,{headers:{'x-test-user':'bob'}})).status,404);assert.equal((await fetch(app.url+a.data.book.files[0].url)).status,401);assert.equal(await(await fetch(app.url+a.data.book.files[0].url,{headers:{'x-test-user':'alice'}})).text(),'Shared document bytes');
 const imported=await call(app,'bob','import','POST',{app:'Sayfa',version:1,books:[{...alice,title:'Bob copy',createdAt:alice.createdAt}]});assert.equal(imported.status,200);assert.ok((await call(app,'bob','books')).data.some(b=>b.id===alice.id&&b.title==='Bob copy'));assert.ok((await call(app,'alice','books')).data.some(b=>b.id===alice.id&&b.title==='Alice private'));
 await call(app,'bob','account/library','DELETE',{});assert.deepEqual((await call(app,'bob','books')).data,[]);assert.equal((await call(app,'alice','books')).data.length,2);assert.equal((await fetch(app.url+a.data.book.files[0].url,{headers:{'x-test-user':'alice'}})).status,200);
 }finally{await close(app);}
});
test('photo covers and topic results are scoped to the signed-in user',async()=>{
 const app=await start();try{await register(app,'alice');await register(app,'bob');const form=new FormData();form.append('metadata',JSON.stringify(book('A private coast study',{description:'Satellite imagery and shoreline erosion.'})));form.append('photo',new Blob([new Uint8Array([255,216,255,224])],{type:'image/jpeg'}),'cover.jpg');const response=await fetch(app.url+'/api/photo-books',{method:'POST',headers:{'x-test-user':'alice'},body:form});assert.equal(response.status,201);const photo=await response.json();assert.equal((await fetch(app.url+photo.coverUrl,{headers:{'x-test-user':'bob'}})).status,404);const own=await fetch(app.url+photo.coverUrl,{headers:{'x-test-user':'alice'}});assert.equal(own.status,200);assert.match(own.headers.get('cache-control'),/no-store/);assert.deepEqual((await call(app,'bob','library-assistant','POST',{query:'satellite shoreline',collection:'all'})).data.matches,[]);assert.equal((await call(app,'alice','library-assistant','POST',{query:'satellite shoreline',collection:'all'})).data.matches[0].id,photo.id);
 }finally{await close(app);}
});
test('owner-only administration and account updates cannot be used to escalate access',async()=>{
 const app=await start();try{await register(app,'alice');await register(app,'admin');assert.equal((await call(app,'alice','admin/users')).status,403);const admin=await call(app,'admin','admin/users');assert.equal(admin.status,200);assert.equal(admin.data.users.length,2);assert.ok(admin.data.users.every(u=>!('data' in u)));await call(app,'alice','account','PATCH',{displayName:'Changed',isAdmin:true,email:'admin@example.test'});const account=await call(app,'alice','account');assert.equal(account.data.user.isAdmin,false);assert.equal(account.data.user.email,'alice@example.test');assert.equal(account.data.user.displayName,'Changed');
 }finally{await close(app);}
});
test('quota reservations prevent concurrent uploads from exceeding a user limit and are released afterward',async()=>{
 const app=await start({MAX_USER_STORAGE_MB:'1',MAX_TOTAL_STORAGE_MB:'10'});try{await register(app,'alice');const result=await Promise.all([upload(app,'alice','a'.repeat(700000)),upload(app,'alice','b'.repeat(700000))]);assert.deepEqual(result.map(r=>r.status).sort(),[201,413]);assert.equal((await call(app,'alice','books')).data.length,1);assert.equal(app.db.prepare('SELECT COUNT(*) AS n FROM upload_reservations').get().n,0);assert.equal((await call(app,'alice','account')).data.storageBytes,700000);await call(app,'alice','account/library','DELETE',{});assert.equal((await upload(app,'alice','c'.repeat(700000))).status,201);
 }finally{await close(app);}
});
test('legacy records remain unassigned until the verified owner signs in',async()=>{
 const db=new DatabaseSync(':memory:');try{for(const name of (await readdir(new URL('../drizzle/',import.meta.url))).filter(n=>n.endsWith('.sql')).sort()){if(name.startsWith('0005')){db.prepare('INSERT INTO books (id,data,created_at) VALUES (?,?,?)').run('legacy-book',JSON.stringify(book('Existing private book',{notes:'Preserve me'})),'2026-01-01T00:00:00Z');}db.exec(await readFile(new URL('../drizzle/'+name,import.meta.url),'utf8'));}
 const env={DB:databaseAdapter(db),BUCKET:localBucket(null),HOSTED:true,APP_OWNER_EMAIL:'owner@example.test'};const request=(name,path,method='GET',data)=>new Request('https://app.test/api/'+path,{method,headers:{'oai-authenticated-user-id':name,'oai-authenticated-user-email':name+'@example.test','Content-Type':'application/json'},...(data?{body:JSON.stringify(data)}:{})});
 await worker.fetch(request('other','account/create','POST',{displayName:'Other'}),env);assert.deepEqual(await(await worker.fetch(request('other','books'),env)).json(),[]);assert.equal(db.prepare("SELECT owner_id FROM books WHERE id='legacy-book'").get().owner_id,'__legacy__');
 await worker.fetch(request('owner','account/create','POST',{displayName:'Owner'}),env);const own=await(await worker.fetch(request('owner','books'),env)).json();assert.equal(own.length,1);assert.equal(own[0].notes,'Preserve me');assert.notEqual(db.prepare("SELECT owner_id FROM books WHERE id='legacy-book'").get().owner_id,'__legacy__');
 }finally{db.close();}
});
test('Firebase verification checks signature, issuer, audience, expiration and verified email',async()=>{
 const pair=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);const jwk={...await crypto.subtle.exportKey('jwk',pair.publicKey),kid:'test-key'};const now=Math.floor(Date.now()/1000),payload={iss:'https://securetoken.google.com/test-project',aud:'test-project',sub:'alice',email:'alice@example.test',email_verified:true,iat:now,auth_time:now,exp:now+3600};const base64=value=>Buffer.from(JSON.stringify(value)).toString('base64url');const token=async changes=>{const data=base64({alg:'RS256',kid:'test-key'})+'.'+base64({...payload,...changes}),sig=await crypto.subtle.sign('RSASSA-PKCS1-v1_5',pair.privateKey,new TextEncoder().encode(data));return data+'.'+Buffer.from(sig).toString('base64url');};const fake=async()=>Response.json({keys:[jwk]});
 assert.equal((await verifyFirebaseToken(await token({}),'test-project',fake)).email,'alice@example.test');for(const changes of [{aud:'other'},{iss:'https://evil.test'},{exp:now-1},{email_verified:false}])assert.equal(await verifyFirebaseToken(await token(changes),'test-project',fake),null);assert.equal(await verifyFirebaseToken((await token({})).slice(0,-8)+'12345678','test-project',fake),null);
});
test('public requests and spoofed user IDs do not activate a local or password bypass on hosted sites',async()=>{
 const db=new DatabaseSync(':memory:');try{for(const name of (await readdir(new URL('../drizzle/',import.meta.url))).filter(n=>n.endsWith('.sql')).sort())db.exec(await readFile(new URL('../drizzle/'+name,import.meta.url),'utf8'));const env={DB:databaseAdapter(db),HOSTED:true,LOCAL_DEV:true,APP_PASSWORD:'test'};const response=await worker.fetch(new Request('https://app.test/api/books',{headers:{'x-test-user':'admin','x-user-id':'admin'}}),env);assert.equal(response.status,401);const config=await(await worker.fetch(new Request('https://app.test/api/auth/config'),env)).json();assert.equal(config.provider,'chatgpt');assert.ok(!JSON.stringify(config).includes('APP_OWNER_EMAIL'));
 }finally{db.close();}
});
