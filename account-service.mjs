import {limits,storageUsage} from './quota-service.mjs';
const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'private, no-store'}});
export async function accountRequest(request,env){
 const path=new URL(request.url).pathname;
 if(path==='/api/account'&&request.method==='GET'){const count=await env.DB.prepare('SELECT COUNT(*) AS n FROM books WHERE owner_id=?').bind(env.USER.id).first();return json({user:env.PUBLIC_USER,books:count.n,storageBytes:await storageUsage(env),limits:limits(env)});}
 if(path==='/api/account'&&request.method==='PATCH'){const input=await request.json(),name=String(input.displayName||'').trim();if(!name||name.length>100)throw Error('Adınız 1–100 karakter olmalıdır.');await env.DB.prepare('UPDATE users SET display_name=? WHERE id=?').bind(name,env.USER.id).run();return json({...env.PUBLIC_USER,displayName:name});}
 if(path==='/api/account/export'&&request.method==='GET'){const {results:rows}=await env.DB.prepare('SELECT id,data,created_at FROM books WHERE owner_id=?').bind(env.USER.id).all();const {results:categories}=await env.DB.prepare('SELECT id,name FROM categories WHERE owner_id=?').bind(env.USER.id).all();return json({app:'Sayfa',version:1,user:env.PUBLIC_USER,books:rows.map(r=>({...JSON.parse(r.data),id:r.id,createdAt:r.created_at})),categories,notice:'Bu dosya orijinal belge dosyalarını içermez.'});}
 if(path==='/api/account/library'&&request.method==='DELETE'){
  const {results:files}=await env.DB.prepare('SELECT object_key,cover_key FROM digital_files WHERE owner_id=?').bind(env.USER.id).all();const {results:books}=await env.DB.prepare('SELECT data FROM books WHERE owner_id=?').bind(env.USER.id).all();const keys=[...files.flatMap(r=>[r.object_key,r.cover_key]),...books.map(r=>JSON.parse(r.data).photoKey)].filter(Boolean);if(keys.length&&!env.BUCKET)throw Error('Dosya depolamaya şu anda ulaşılamıyor.');for(let offset=0;offset<keys.length;offset+=50)await env.BUCKET.delete(keys.slice(offset,offset+50));await env.DB.batch(['digital_files','books','categories','upload_reservations'].map(table=>env.DB.prepare('DELETE FROM '+table+' WHERE owner_id=?').bind(env.USER.id)));return json({ok:true});
 }
 if(path==='/api/admin/users'&&request.method==='GET'){
  if(!env.PUBLIC_USER.isAdmin)return json({error:'Bu sayfa yalnızca yöneticiye açıktır.'},403);
  const {results}=await env.DB.prepare('SELECT u.id,u.display_name,u.email,u.created_at,u.last_seen,(SELECT COUNT(*) FROM books b WHERE b.owner_id=u.id) AS book_count,(SELECT COUNT(*) FROM digital_files f WHERE f.owner_id=u.id) AS file_count,(SELECT COALESCE(SUM(size),0) FROM digital_files f WHERE f.owner_id=u.id) AS file_bytes FROM users u ORDER BY created_at DESC LIMIT 500').all();return json({users:results,limits:limits(env),notice:'Yönetim görünümü hesap ve kullanım bilgilerini gösterir; kullanıcıların kitap içeriklerini açmaz.'});
 }
 return json({error:'İşlem bulunamadı.'},404);
}
