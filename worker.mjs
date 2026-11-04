import {answerLibrary} from './assistant-service.mjs';
import {categoryRequest} from './category-service.mjs';
import {photoRequest} from './photo-service.mjs';
import {describeBook} from './description-service.mjs';
import {cleanBook} from './book-data.mjs';
import {handleDigitalRequest,attachFiles,deleteBookFiles} from './digital-service.mjs';
import {lookupBooks} from './metadata-service.mjs';
import {searchCovers,fetchCoverImage,validateCoverURL} from './cover-service.mjs';
const encoder = new TextEncoder();
const cookieName = 'stillroom_session';
const json = (data, status = 200, extra = {}) => new Response(JSON.stringify(data), {status, headers: {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...extra}});
async function digest(value) { return new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value))); }
async function same(a,b) { const x=await digest(a),y=await digest(b); let diff=0; for(let i=0;i<x.length;i++) diff|=x[i]^y[i]; return diff===0; }
async function signature(value, password) {
 const key=await crypto.subtle.importKey('raw',encoder.encode(password),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 return Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',key,encoder.encode(value))),b=>b.toString(16).padStart(2,'0')).join('');
}
async function authenticated(request,env) {
 if(env.LOCAL_DEV && !env.APP_PASSWORD) return true;
 const value=(request.headers.get('cookie')||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(cookieName+'='))?.slice(cookieName.length+1);
 if(!value||!env.APP_PASSWORD) return false;
 const [expiry,sig]=value.split('.');
 return /^\d+$/.test(expiry)&&Number(expiry)>Date.now()&&Number(expiry)<Date.now()+8*86400000&&!!sig&&await same(sig,await signature(expiry,env.APP_PASSWORD));
}

async function body(request, limit = 90000) {
 const raw=await request.text(); if(raw.length>limit)throw Error('Request is too large.');
 try{return JSON.parse(raw);}catch{throw Error('Invalid JSON.');}
}
export async function handleApi(request,env) {
 const url=new URL(request.url),path=url.pathname;
 if(!env.APP_PASSWORD&&!env.LOCAL_DEV)return json({error:'Set the APP_PASSWORD secret before using this library.'},503);
 if(!['GET','HEAD'].includes(request.method)) {
  const origin=request.headers.get('origin'); if(origin&&origin!==url.origin)return json({error:'Bu isteğe izin verilmiyor.'},403);
  if(!(['/api/digital-files','/api/photo-books'].includes(path)&&request.method==='POST'&&request.headers.get('content-type')?.startsWith('multipart/form-data;'))&&request.headers.get('content-type')?.split(';')[0]!=='application/json')return json({error:'Geçerli veri gönderin.'},415);
 }
 if(path==='/api/session'&&request.method==='GET')return json({authenticated:await authenticated(request,env),local:!!env.LOCAL_DEV, passwordProtected:!!env.APP_PASSWORD});
 if(path==='/api/login'&&request.method==='POST') {
  const ip=request.headers.get('cf-connecting-ip')||'local',now=Date.now();
  const attempt=await env.DB.prepare('SELECT attempts, window_start FROM login_attempts WHERE ip = ?').bind(ip).first();
  if(attempt&&now-attempt.window_start<900000&&attempt.attempts>=10)return json({error:'Çok fazla deneme yapıldı. 15 dakika sonra yeniden deneyin.'},429);
  const {password}=await body(request);
  if(typeof password!=='string'||password.length>512||!env.APP_PASSWORD||!await same(password,env.APP_PASSWORD)){
   await env.DB.prepare('INSERT INTO login_attempts (ip, attempts, window_start) VALUES (?, 1, ?) ON CONFLICT(ip) DO UPDATE SET attempts = CASE WHEN window_start < ? THEN 1 ELSE attempts + 1 END, window_start = CASE WHEN window_start < ? THEN ? ELSE window_start END').bind(ip,now,now-900000,now-900000,now).run();
   await env.DB.prepare('DELETE FROM login_attempts WHERE window_start < ?').bind(now-86400000).run();
   return json({error:'Şifre doğru değil.'},401);
  }
  await env.DB.prepare('DELETE FROM login_attempts WHERE ip = ?').bind(ip).run();
  const expiry=String(now+7*86400000),sig=await signature(expiry,env.APP_PASSWORD);
  return json({ok:true},200,{'Set-Cookie':`${cookieName}=${expiry}.${sig}; HttpOnly; SameSite=Strict; Path=/; Max-Age=604800${env.LOCAL_DEV?'':'; Secure'}`});
 }
 if(!await authenticated(request,env))return json({error:'Kütüphanenizin kilidini açın.'},401);
 if(path==='/api/categories'||path.startsWith('/api/categories/'))return categoryRequest(request,env);
 if(path==='/api/photo-books'||path.startsWith('/api/book-photos/'))return photoRequest(request,env);
 if(path==='/api/assistant-status'&&request.method==='GET')return json({aiEnabled:false});
 if(path==='/api/library-assistant'&&request.method==='POST'){const params=await body(request);const {results}=await env.DB.prepare('SELECT id, data, created_at FROM books').all();return json(await answerLibrary(params,results.map(row=>({...JSON.parse(row.data),id:row.id,createdAt:row.created_at})),env));}
 if(path==='/api/book-lookup'&&request.method==='GET'){try{return json(await lookupBooks({title:url.searchParams.get('title')||'',author:url.searchParams.get('author')||'',isbn:url.searchParams.get('isbn')||''}));}catch(error){return json({error:error.message},503);}}
 if(path==='/api/digital-files'||path.startsWith('/api/digital-files/'))return handleDigitalRequest(request,env);
 if(path==='/api/covers'&&request.method==='GET'){try{return json(await searchCovers({title:url.searchParams.get('title')||'',author:url.searchParams.get('author')||'',isbn:url.searchParams.get('isbn')||''}));}catch(error){return json({error:error.message},503);}}
 if(path==='/api/cover-image'&&request.method==='GET'){const imageURL=validateCoverURL(url.searchParams.get('url')||'');if(imageURL.startsWith('/api/book-photos/'))return photoRequest(new Request(new URL(imageURL,request.url)),env);if(imageURL.startsWith('/api/digital-files/'))return handleDigitalRequest(new Request(new URL(imageURL,request.url)),env);if(imageURL.startsWith('/covers/'))return env.ASSETS.fetch(new Request(new URL(imageURL,request.url)));return fetchCoverImage(imageURL);}
 if(path==='/api/logout'&&request.method==='POST')return json({ok:true},200,{'Set-Cookie':`${cookieName}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${env.LOCAL_DEV?'':'; Secure'}`});
 if(path==='/api/import'&&request.method==='POST') {
  const backup=await body(request,5000000);
  if(!['Necle’nin Kütüphanesi'].includes(backup.app)||backup.version!==1||!Array.isArray(backup.books)||backup.books.length>1000)throw Error('En fazla 1.000 kitap içeren bir Necle kütüphane yedeği seçin.');
  const entries=backup.books.map(b=>{
   if(typeof b.id!=='string'||!/^[a-zA-Z0-9-]{1,80}$/.test(b.id)||typeof b.createdAt!=='string'||!Number.isFinite(Date.parse(b.createdAt)))throw Error('Yedekte geçersiz bir kitap kaydı var.');
   return {id:b.id,data:JSON.stringify(cleanBook(b)),createdAt:new Date(b.createdAt).toISOString()};
  });
  for(let i=0;i<entries.length;i+=50)await env.DB.batch(entries.slice(i,i+50).map(b=>env.DB.prepare('INSERT INTO books (id, data, created_at) VALUES (?, ?, ?) ON CONFLICT(id) DO NOTHING').bind(b.id,b.data,b.createdAt)));
  return json({ok:true});
 }
 if(path==='/api/books'&&request.method==='GET') {
  const {results}=await env.DB.prepare('SELECT id, data, created_at FROM books ORDER BY created_at DESC, id').all();
  return json((await attachFiles(results.map(row=>({...JSON.parse(row.data),id:row.id,createdAt:row.created_at})),env)).map(describeBook));
 }
 if(path==='/api/books'&&request.method==='POST') {
  const b=cleanBook(await body(request)),id=crypto.randomUUID(),createdAt=new Date().toISOString();
  await env.DB.prepare('INSERT INTO books (id, data, created_at) VALUES (?, ?, ?)').bind(id,JSON.stringify(b),createdAt).run();return json(describeBook({...b,id,createdAt}),201);
 }
 const match=path.match(/^\/api\/books\/([a-zA-Z0-9-]{1,80})$/);
 if(match&&['PUT','DELETE'].includes(request.method)) {
  const old=await env.DB.prepare('SELECT data, created_at FROM books WHERE id = ?').bind(match[1]).first();
  if(!old)return json({error:'Bu kitap kaldırılmış. Kütüphaneyi yenileyin.'},404);
  if(request.method==='DELETE'){await deleteBookFiles(match[1],env);if(JSON.parse(old.data).photoKey)await env.BUCKET.delete(JSON.parse(old.data).photoKey);await env.DB.prepare('DELETE FROM books WHERE id = ?').bind(match[1]).run();return json({ok:true});}
  const b=cleanBook({...JSON.parse(old.data),...await body(request),collection:JSON.parse(old.data).collection||'physical'});if(JSON.parse(old.data).photoKey)b.photoKey=JSON.parse(old.data).photoKey;await env.DB.prepare('UPDATE books SET data = ? WHERE id = ?').bind(JSON.stringify(b),match[1]).run();return json(describeBook((await attachFiles([{...b,id:match[1],createdAt:old.created_at}],env))[0]));
 }
 return json({error:'Bulunamadı.'},404);
}
export default {async fetch(request,env){
 try {
  const path=new URL(request.url).pathname;
  const response=path.startsWith('/api/')?await handleApi(request,env):await env.ASSETS.fetch(request);
  const headers=new Headers(response.headers);
  headers.set('X-Content-Type-Options','nosniff');headers.set('Referrer-Policy','same-origin');if(path==='/necle-library-source.zip'){headers.set('Content-Disposition','attachment; filename="necle-library-source.zip"');headers.set('Cache-Control','private, no-store');}if(path==='/sw.js'){headers.set('Cache-Control','no-cache');headers.set('Service-Worker-Allowed','/');}if(path==='/manifest.webmanifest')headers.set('Cache-Control','no-cache');
  if(!headers.has('Content-Security-Policy'))headers.set('Content-Security-Policy',"default-src 'self'; script-src 'self' https://cdn.jsdelivr.net 'wasm-unsafe-eval'; style-src 'self'; img-src 'self' data: blob:; connect-src 'self' https://cdn.jsdelivr.net https://tessdata.projectnaptha.com; worker-src 'self' blob:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
  return new Response(response.body,{status:response.status,headers});
 }catch(error){console.error(error);return json({error:error.message?.startsWith('D1_')?'Veritabanına ulaşılamıyor. Yeniden deneyin.':error.message||'Bir hata oluştu.'},400);}
}};
