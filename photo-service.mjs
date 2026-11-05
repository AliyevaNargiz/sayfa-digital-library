import {bookInsert,changed,reserveStorage,releaseStorage} from './quota-service.mjs';
import {cleanBook} from './book-data.mjs';
import {describeBook} from './description-service.mjs';
export async function photoRequest(request,env){
 const path=new URL(request.url).pathname,match=path.match(/^\/api\/book-photos\/([a-zA-Z0-9-]{1,80})$/);
 if(match&&request.method==='GET'){
  const row=await env.DB.prepare('SELECT data FROM books WHERE id=? AND owner_id=?').bind(match[1],env.USER.id).first();const key=row&&JSON.parse(row.data).photoKey;if(!key)return new Response('Görsel bulunamadı.',{status:404});
  const object=await env.BUCKET?.get(key);return object?new Response(object.body,{headers:{'Content-Type':'image/jpeg','Cache-Control':'private, no-store'}}):new Response('Görsel bulunamadı.',{status:404});
 }
 if(path!=='/api/photo-books'||request.method!=='POST')return Response.json({error:'İşlem bulunamadı.'},{status:404});
 if(Number(request.headers.get('Content-Length')||0)>700000)return Response.json({error:'Fotoğraf önizlemesi çok büyük.'},{status:413});
 const form=await request.formData();const raw=String(form.get('metadata')||'{}');if(raw.length>20000)throw Error('Kitap bilgileri çok uzun.');
 const b=describeBook(cleanBook({...JSON.parse(raw),collection:'physical',reading:'Not set',borrower:'',loanedAt:'',dueDate:''}));
 const id=crypto.randomUUID(),createdAt=new Date().toISOString();let key;
 if(!b.coverUrl){const image=form.get('photo');if(image&&image.size>0&&image.size<524288){if(!env.BUCKET)throw Error('Görsel depolama şu anda kullanılamıyor.');const bytes=new Uint8Array(await image.arrayBuffer());if(bytes[0]!==255||bytes[1]!==216||bytes[2]!==255)throw Error('Geçerli bir JPEG önizlemesi seçin.');key='digital/'+id+'-book-photo.jpg';await reserveStorage(env,id,bytes.byteLength);try{await env.BUCKET.put(key,bytes,{httpMetadata:{contentType:'image/jpeg'}});}catch(error){await releaseStorage(env,id);throw error;}b.photoBytes=bytes.byteLength;b.coverUrl='/api/book-photos/'+id;b.coverProvider='Kitap fotoğrafı';b.coverSource='';b.photoKey=key;}}
 try{const result=await bookInsert(env,b,id,createdAt).run();if(!changed(result))throw Object.assign(Error('Kitap sınırına ulaşıldı.'),{status:413});}catch(error){if(key)await env.BUCKET.delete(key);throw error;}finally{if(key)await releaseStorage(env,id);}
 return Response.json({...b,id,createdAt,files:[]},{status:201,headers:{'Cache-Control':'no-store'}});
}
