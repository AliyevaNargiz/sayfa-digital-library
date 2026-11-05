export const changed=result=>Number(result?.meta?.changes??result?.changes??0);
export function limits(env){return {bookLimit:Math.max(1,Number(env.MAX_USER_BOOKS)||1000),globalBooks:Math.max(1,Number(env.MAX_TOTAL_BOOKS)||10000),storageBytes:Math.max(1,Number(env.MAX_USER_STORAGE_MB)||100)*1048576,totalBytes:Math.max(1,Number(env.MAX_TOTAL_STORAGE_MB)||1000)*1048576};}
const bytesSQL="COALESCE((SELECT SUM(size+CASE WHEN cover_key IS NOT NULL THEN CASE WHEN cover_size>0 THEN cover_size ELSE 524288 END ELSE 0 END) FROM digital_files %WHERE%),0)+COALESCE((SELECT SUM(CASE WHEN json_extract(data,'$.photoKey') IS NOT NULL THEN COALESCE(json_extract(data,'$.photoBytes'),524288) ELSE 0 END) FROM books %WHERE%),0)";
export async function storageUsage(env,ownerId=env.USER.id){return (await env.DB.prepare('SELECT '+bytesSQL.replaceAll('%WHERE%','WHERE owner_id=?')+' AS bytes').bind(ownerId,ownerId).first())?.bytes||0;}
export function bookInsert(env,book,id,date){const cap=limits(env);return env.DB.prepare('INSERT INTO books (owner_id,id,data,created_at) SELECT ?,?,?,? WHERE (SELECT COUNT(*) FROM books WHERE owner_id=?) < ? AND (SELECT COUNT(*) FROM books) < ? ON CONFLICT(owner_id,id) DO NOTHING').bind(env.USER.id,id,JSON.stringify(book),date,env.USER.id,cap.bookLimit,cap.globalBooks);}
export async function reserveStorage(env,id,bytes){
 const cap=limits(env),now=Date.now();await env.DB.prepare('DELETE FROM upload_reservations WHERE created_at<?').bind(now-600000).run();
 const own=bytesSQL.replaceAll('%WHERE%','WHERE owner_id=?'),all=bytesSQL.replaceAll('%WHERE%','');
 const result=await env.DB.prepare('INSERT INTO upload_reservations (id,owner_id,bytes,created_at) SELECT ?,?,?,? WHERE ('+own+')+COALESCE((SELECT SUM(bytes) FROM upload_reservations WHERE owner_id=?),0)+?<=? AND ('+all+')+COALESCE((SELECT SUM(bytes) FROM upload_reservations),0)+?<=?').bind(id,env.USER.id,bytes,now,env.USER.id,env.USER.id,env.USER.id,bytes,cap.storageBytes,bytes,cap.totalBytes).run();
 if(!changed(result))throw Object.assign(Error('Dosya depolama sınırına ulaşıldı. Yer açın veya yöneticiyle görüşün.'),{status:413});
}
export const releaseStorage=(env,id)=>env.DB.prepare('DELETE FROM upload_reservations WHERE id=? AND owner_id=?').bind(id,env.USER.id).run();
