import {localeHint} from './locale-service.mjs';
import {requestIdentity,findUser,registerUser,claimLegacyLibrary,userDescriptor,publicAuthConfig,identityCookie,clearIdentityCookie,isAdministrator} from './identity-service.mjs';
import {accountRequest} from './account-service.mjs';
import {bookInsert,changed,limits} from './quota-service.mjs';
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
 if(!['GET','HEAD'].includes(request.method)){
  const origin=request.headers.get('origin');if(origin&&origin!==url.origin)return json({error:'Bu isteğe izin verilmiyor.'},403);
  if(!(['/api/digital-files','/api/photo-books'].includes(path)&&request.method==='POST'&&request.headers.get('content-type')?.startsWith('multipart/form-data;'))&&request.headers.get('content-type')?.split(';')[0]!=='application/json')return json({error:'Geçerli veri gönderin.'},415);
 }
 if(path==='/api/locale'&&request.method==='GET')return json(localeHint(request));
 if(path==='/api/auth/config'&&request.method==='GET')return json(publicAuthConfig(env));
 if(path==='/api/login'&&request.method==='POST'&&!env.HOSTED&&!env.FIREBASE_PROJECT_ID){
  const ip=request.headers.get('cf-connecting-ip')||'local',now=Date.now();
  const attempt=await env.DB.prepare('SELECT attempts,window_start FROM login_attempts WHERE ip=?').bind(ip).first();if(attempt&&now-attempt.window_start<900000&&attempt.attempts>=10)return json({error:'Çok fazla deneme yapıldı. 15 dakika sonra yeniden deneyin.'},429);
  const {password}=await body(request);if(typeof password!=='string'||password.length>512||!env.APP_PASSWORD||!await same(password,env.APP_PASSWORD)){
   await env.DB.prepare('INSERT INTO login_attempts (ip,attempts,window_start) VALUES (?,1,?) ON CONFLICT(ip) DO UPDATE SET attempts=CASE WHEN window_start<? THEN 1 ELSE attempts+1 END,window_start=CASE WHEN window_start<? THEN ? ELSE window_start END').bind(ip,now,now-900000,now-900000,now).run();return json({error:'Şifre doğru değil.'},401);
  }
  await env.DB.prepare('DELETE FROM login_attempts WHERE ip=?').bind(ip).run();const expiry=String(now+7*86400000),sig=await signature(expiry,env.APP_PASSWORD);return json({ok:true},200,{'Set-Cookie':`${cookieName}=${expiry}.${sig}; HttpOnly; SameSite=Strict; Path=/; Max-Age=604800${env.LOCAL_DEV?'':'; Secure'}`});
 }
 let identity=await requestIdentity(request,env);
 if(!identity&&!env.HOSTED&&!env.FIREBASE_PROJECT_ID&&env.APP_PASSWORD&&await authenticated(request,env))identity={provider:'local',subject:'password-library',email:'',emailVerified:true,name:'Yerel kullanıcı'};
 if(path==='/api/logout'&&request.method==='POST'){const response=json({ok:true},200,{'Set-Cookie':clearIdentityCookie()});response.headers.append('Set-Cookie',`${cookieName}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${env.LOCAL_DEV?'':'; Secure'}`);return response;}
 if(path==='/api/auth/session'&&request.method==='POST'){if(!identity||identity.provider!=='firebase')return json({error:'Lütfen e-posta adresinizi doğrulayıp yeniden giriş yapın.'},401);return json({ok:true},200,{'Set-Cookie':identityCookie(identity)});}
 let user=await findUser(identity,env);
 if(identity?.provider==='local'&&!user){user=await registerUser(identity,identity.name,env);await claimLegacyLibrary(user,identity,env);}
 if(path==='/api/session'&&request.method==='GET'){
  if(user){await claimLegacyLibrary(user,identity,env);await env.DB.prepare('UPDATE users SET last_seen=? WHERE id=? AND last_seen<?').bind(new Date().toISOString(),user.id,new Date(Date.now()-900000).toISOString()).run();}
  return json({authenticated:!!identity,registered:!!user,user:userDescriptor(user,identity,env),identity:identity?{email:identity.email||'',name:identity.name||''}:null,local:!!env.LOCAL_DEV,passwordProtected:!!env.APP_PASSWORD,provider:publicAuthConfig(env).provider});
 }
 if(!identity)return json({error:'Kütüphanenize erişmek için giriş yapın.'},401);
 if(path==='/api/account/create'&&request.method==='POST'){const data=await body(request);user=await registerUser(identity,data.displayName,env);await claimLegacyLibrary(user,identity,env);return json({user:userDescriptor(user,identity,env)},201);}
 if(!user)return json({error:'Önce kendi kitaplığınızı oluşturun.',code:'PROFILE_REQUIRED'},403);
 env={...env,USER:user,PUBLIC_USER:userDescriptor(user,identity,env)};
 if(path.startsWith('/api/account')||path.startsWith('/api/admin/'))return accountRequest(request,env);
 if(path==='/api/categories'||path.startsWith('/api/categories/'))return categoryRequest(request,env);
 if(path==='/api/photo-books'||path.startsWith('/api/book-photos/'))return photoRequest(request,env);
 if(path==='/api/assistant-status'&&request.method==='GET')return json({aiEnabled:false});
 if(path==='/api/library-assistant'&&request.method==='POST'){const params=await body(request);const {results}=await env.DB.prepare('SELECT id,data,created_at FROM books WHERE owner_id=?').bind(user.id).all();return json(await answerLibrary(params,results.map(row=>({...JSON.parse(row.data),id:row.id,createdAt:row.created_at})),env));}
 if(path==='/api/book-lookup'&&request.method==='GET'){try{return json(await lookupBooks({title:url.searchParams.get('title')||'',author:url.searchParams.get('author')||'',isbn:url.searchParams.get('isbn')||''}));}catch(error){return json({error:error.message},503);}}
 if(path==='/api/digital-files'||path.startsWith('/api/digital-files/'))return handleDigitalRequest(request,env);
 if(path==='/api/covers'&&request.method==='GET'){try{return json(await searchCovers({title:url.searchParams.get('title')||'',author:url.searchParams.get('author')||'',isbn:url.searchParams.get('isbn')||''}));}catch(error){return json({error:error.message},503);}}
 if(path==='/api/cover-image'&&request.method==='GET'){const imageURL=validateCoverURL(url.searchParams.get('url')||'');if(imageURL.startsWith('/api/book-photos/'))return photoRequest(new Request(new URL(imageURL,request.url)),env);if(imageURL.startsWith('/api/digital-files/'))return handleDigitalRequest(new Request(new URL(imageURL,request.url)),env);if(imageURL.startsWith('/covers/'))return env.ASSETS.fetch(new Request(new URL(imageURL,request.url)));return fetchCoverImage(imageURL);}
 if(path==='/api/import'&&request.method==='POST'){
  const backup=await body(request,5000000);if(!['Sayfa','Necle’nin Kütüphanesi'].includes(backup.app)||backup.version!==1||!Array.isArray(backup.books)||backup.books.length>1000)throw Error('Geçerli bir kütüphane yedeği seçin.');
  const {results:owned}=await env.DB.prepare('SELECT id FROM books WHERE owner_id=?').bind(user.id).all();const ids=new Set(owned.map(b=>b.id));
  const entries=[];for(const b of backup.books){if(typeof b.id!=='string'||!/^[a-zA-Z0-9-]{1,80}$/.test(b.id)||typeof b.createdAt!=='string'||!Number.isFinite(Date.parse(b.createdAt)))throw Error('Yedekte geçersiz bir kitap kaydı var.');const clean=cleanBook(b);if(!ids.has(b.id)){entries.push({id:b.id,data:clean,createdAt:new Date(b.createdAt).toISOString()});ids.add(b.id);}}
  if(ids.size>limits(env).bookLimit)throw Object.assign(Error('Kitap sınırına ulaşıldı.'),{status:413});for(let offset=0;offset<entries.length;offset+=30){const result=await env.DB.batch(entries.slice(offset,offset+30).map(b=>bookInsert(env,b.data,b.id,b.createdAt)));if(result.some(r=>!changed(r)))throw Object.assign(Error('Kapasite dolduğu için bazı kayıtlar eklenemedi. Kaydedilenler korunur.'),{status:413});}return json({ok:true});
 }
 if(path==='/api/books'&&request.method==='GET'){const {results}=await env.DB.prepare('SELECT id,data,created_at FROM books WHERE owner_id=? ORDER BY created_at DESC,id').bind(user.id).all();return json((await attachFiles(results.map(row=>({...JSON.parse(row.data),id:row.id,createdAt:row.created_at})),env)).map(describeBook));}
 if(path==='/api/books'&&request.method==='POST'){const b=cleanBook(await body(request)),id=crypto.randomUUID(),createdAt=new Date().toISOString();if(!changed(await bookInsert(env,b,id,createdAt).run()))throw Object.assign(Error('Kitap sınırına ulaşıldı.'),{status:413});return json(describeBook({...b,id,createdAt}),201);}
 const match=path.match(/^\/api\/books\/([a-zA-Z0-9-]{1,80})$/);
 if(match&&['PUT','DELETE'].includes(request.method)){
  const old=await env.DB.prepare('SELECT data,created_at FROM books WHERE owner_id=? AND id=?').bind(user.id,match[1]).first();if(!old)return json({error:'Kitap bulunamadı.'},404);
  if(request.method==='DELETE'){await deleteBookFiles(match[1],env);if(JSON.parse(old.data).photoKey)await env.BUCKET.delete(JSON.parse(old.data).photoKey);await env.DB.prepare('DELETE FROM books WHERE owner_id=? AND id=?').bind(user.id,match[1]).run();return json({ok:true});}
  const saved=JSON.parse(old.data),b=cleanBook({...saved,...await body(request),collection:saved.collection||'physical'});if(saved.photoKey){b.photoKey=saved.photoKey;b.photoBytes=saved.photoBytes;}
  await env.DB.prepare('UPDATE books SET data=? WHERE owner_id=? AND id=?').bind(JSON.stringify(b),user.id,match[1]).run();return json(describeBook((await attachFiles([{...b,id:match[1],createdAt:old.created_at}],env))[0]));
 }
 return json({error:'Bulunamadı.'},404);
}
export default {async fetch(request,env){
 try {
  const path=new URL(request.url).pathname;
  if(path.endsWith('-source.zip')){const identity=await requestIdentity(request,env);if(!isAdministrator(identity,env))return json({error:'Bu dosya yalnızca site sahibine açıktır.'},403);}
  const response=path.startsWith('/api/')?await handleApi(request,env):await env.ASSETS.fetch(request);
  const headers=new Headers(response.headers);
  headers.set('X-Content-Type-Options','nosniff');headers.set('Referrer-Policy','same-origin');if(path==='/necle-library-source.zip'){headers.set('Content-Disposition','attachment; filename="necle-library-source.zip"');headers.set('Cache-Control','private, no-store');}if(path==='/sw.js'){headers.set('Cache-Control','no-cache');headers.set('Service-Worker-Allowed','/');}if(path==='/manifest.webmanifest')headers.set('Cache-Control','no-cache');
  if(!headers.has('Content-Security-Policy'))headers.set('Content-Security-Policy',"default-src 'self'; script-src 'self' https://apis.google.com https://cdn.jsdelivr.net 'wasm-unsafe-eval'; style-src 'self'; img-src 'self' data: blob:; connect-src 'self' https://cdn.jsdelivr.net https://tessdata.projectnaptha.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://www.googleapis.com https://*.firebaseapp.com; frame-src https://*.firebaseapp.com https://*.web.app https://accounts.google.com; worker-src 'self' blob:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
  return new Response(response.body,{status:response.status,headers});
 }catch(error){console.error(error);return json({error:error.message?.startsWith('D1_')?'Veritabanına ulaşılamıyor. Yeniden deneyin.':error.message||'Bir hata oluştu.'},Number(error.status)||400);}
}};
