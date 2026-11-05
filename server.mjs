import {createServer} from 'node:http';
import {DatabaseSync} from 'node:sqlite';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import worker from './worker.mjs';
import {localBucket} from './local-bucket.mjs';
export function databaseAdapter(db) {return {async batch(statements){db.exec('BEGIN');try{const result=[];for(const statement of statements)result.push(await statement.run());db.exec('COMMIT');return result;}catch(e){db.exec('ROLLBACK');throw e;}},prepare(sql){let args=[];return {bind(...values){args=values;return this;},async first(){return db.prepare(sql).get(...args)||null;},async all(){return {results:db.prepare(sql).all(...args)};},async run(){return db.prepare(sql).run(...args);}};}};}
export async function startServer({port=Number(process.env.PORT||3000),host=process.env.HOST||'127.0.0.1',dbPath=process.env.DATABASE_PATH||'.data/library.sqlite',testIdentityResolver,bindings={}}={}) {
 if(dbPath!==':memory:')await mkdir(resolve(dbPath,'..'),{recursive:true});
 const db=new DatabaseSync(dbPath);db.exec('PRAGMA journal_mode = WAL;');
 db.exec(await readFile(new URL('./migrations/0001_library.sql',import.meta.url),'utf8'));
 if(!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='digital_files'").get())db.exec(await readFile(new URL('./drizzle/0002_lyrical_odin.sql',import.meta.url),'utf8'));
 if(!db.prepare('PRAGMA table_info(digital_files)').all().some(c=>c.name==='cover_key'))db.exec(await readFile(new URL('./drizzle/0003_robust_triathlon.sql',import.meta.url),'utf8'));
 if(!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='categories'").get())db.exec(await readFile(new URL('./drizzle/0004_categories.sql',import.meta.url),'utf8'));
 if(!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").get())db.exec(await readFile(new URL('./drizzle/0005_accounts_and_ownership.sql',import.meta.url),'utf8'));
 const root=new URL('./public/',import.meta.url);
 const env={DB:databaseAdapter(db),BUCKET:localBucket(dbPath===':memory:'?null:resolve(dbPath,'..','files')),...Object.fromEntries(['FIREBASE_PROJECT_ID','FIREBASE_API_KEY','FIREBASE_AUTH_DOMAIN','FIREBASE_APP_ID','APP_OWNER_EMAIL','MAX_USERS','MAX_USER_BOOKS','MAX_TOTAL_BOOKS','MAX_USER_STORAGE_MB','MAX_TOTAL_STORAGE_MB'].filter(key=>process.env[key]).map(key=>[key,process.env[key]])),...bindings,LOCAL_DEV:true,TEST_IDENTITY_RESOLVER:testIdentityResolver,APP_PASSWORD:process.env.APP_PASSWORD,ASSETS:{async fetch(req){
  const path=new URL(req.url).pathname;const name=['/','/login','/register','/library','/guide','/account','/admin','/privacy','/auth/complete'].includes(path)?'index.html':decodeURIComponent(path.slice(1));
  if(name.includes('..')||name.includes('\\'))return new Response('Not found',{status:404});
  try {const bytes=await readFile(new URL(name,root));const types={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json','.jpg':'image/jpeg','.zip':'application/zip'};return new Response(bytes,{headers:{'Content-Type':types[extname(name)]||'application/octet-stream'}});}catch{return new Response('Not found',{status:404});}
 }}};
 const server=createServer(async(req,res)=>{try{
  let size=0;const chunks=[];for await(const chunk of req){size+=chunk.length;if(size>27*1024*1024){res.writeHead(413);res.end('Request too large');return;}chunks.push(chunk);}
  const authority=req.headers.host||'localhost';
  const request=new Request(`http://${authority}${req.url}`,{method:req.method,headers:req.headers,...(!['GET','HEAD'].includes(req.method)?{body:Buffer.concat(chunks)}:{})});
  const response=await worker.fetch(request,env);res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
 }catch{res.writeHead(500);res.end('Server error');}});
 await new Promise(r=>server.listen(port,host,r));
 return {server,db,url:`http://${host}:${server.address().port}`};
}
if(process.argv[1]&&resolve(process.argv[1])===resolve(new URL(import.meta.url).pathname)){const {url}=await startServer();console.log(`Sayfa is open at ${url}\nBooks are saved in .data/library.sqlite. Press Ctrl+C to stop.`);}
