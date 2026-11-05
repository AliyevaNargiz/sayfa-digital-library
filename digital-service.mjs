import {bookInsert,changed,reserveStorage,releaseStorage} from './quota-service.mjs';
import {describeBook} from './description-service.mjs';
import {cleanBook} from './book-data.mjs';
export const MAX_FILE_BYTES=25*1024*1024;
export const DOCUMENT_TYPES={pdf:'application/pdf',epub:'application/epub+zip',txt:'text/plain',md:'text/plain',csv:'text/csv',rtf:'application/rtf',doc:'application/msword',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',odt:'application/vnd.oasis.opendocument.text',ppt:'application/vnd.ms-powerpoint',pptx:'application/vnd.openxmlformats-officedocument.presentationml.presentation',xls:'application/vnd.ms-excel',xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',mobi:'application/x-mobipocket-ebook',azw:'application/octet-stream',azw3:'application/octet-stream',djvu:'image/vnd.djvu',cbz:'application/vnd.comicbook+zip',cbr:'application/vnd.comicbook-rar',fb2:'application/xml'};
const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
const descriptor=row=>({id:row.id,name:row.file_name,mime:row.mime,size:row.size,uploadedAt:row.uploaded_at,url:'/api/digital-files/'+row.id,downloadUrl:'/api/digital-files/'+row.id+'?download=1'});
export async function attachFiles(books,env){
 // Older local databases without uploads remain readable.
 let rows=[];try{({results:rows}=await env.DB.prepare('SELECT id, book_id, file_name, mime, size, uploaded_at FROM digital_files WHERE owner_id=?').bind(env.USER.id).all());}catch(error){if(!String(error.message).includes('no such table'))throw error;}
 const grouped=new Map();for(const row of rows){if(!grouped.has(row.book_id))grouped.set(row.book_id,[]);grouped.get(row.book_id).push(descriptor(row));}
 return books.map(b=>({...b,collection:b.collection||'physical',files:grouped.get(b.id)||[]}));
}
export async function deleteBookFiles(bookId,env){
 let rows=[];try{({results:rows}=await env.DB.prepare('SELECT id, object_key, cover_key FROM digital_files WHERE book_id = ? AND owner_id=?').bind(bookId,env.USER.id).all());}catch(error){if(!String(error.message).includes('no such table'))throw error;return;}
 if(rows.length){if(!env.BUCKET)throw Error('Dosya depolamaya ulaşılamıyor. Yeniden deneyin.');await env.BUCKET.delete(rows.flatMap(r=>[r.object_key,r.cover_key].filter(Boolean)));await env.DB.prepare('DELETE FROM digital_files WHERE book_id = ? AND owner_id=?').bind(bookId,env.USER.id).run();}
}
async function duplicateRecord(hash,env){
 const row=await env.DB.prepare('SELECT id, book_id FROM digital_files WHERE hash = ? AND owner_id=?').bind(hash,env.USER.id).first();if(!row)return null;
 const book=await env.DB.prepare('SELECT id, data, created_at FROM books WHERE id = ? AND owner_id=?').bind(row.book_id,env.USER.id).first();
 if(!book)return null;return (await attachFiles([{...JSON.parse(book.data),id:book.id,createdAt:book.created_at}],env))[0];
}
export async function handleDigitalRequest(request,env){
 const url=new URL(request.url),path=url.pathname;
 if(!env.BUCKET)return json({error:'Özel dosya depolama şu anda kullanılamıyor. Biraz sonra yeniden deneyin.'},503);
 if(path==='/api/digital-files'&&request.method==='POST'){
  if(Number(request.headers.get('Content-Length')||0)>MAX_FILE_BYTES+700000)return json({error:'Her dosya en fazla 25 MB olabilir.'},413);
  let form;try{form=await request.formData();}catch{return json({error:'Dosya alınamadı. Yeniden deneyin.'},400);}
  const file=form.get('file');if(!file||typeof file.arrayBuffer!=='function')return json({error:'Yüklemek için bir belge seçin.'},400);
  const rawName=String(file.name||'document').replace(/[\x00-\x1f\\/]/g,'_'),extension=rawName.split('.').pop().toLowerCase(),name=rawName.length>240?rawName.slice(0,235-extension.length)+'.'+extension:rawName;
  if(!DOCUMENT_TYPES[extension])return json({error:'Desteklenmeyen dosya türü. PDF, EPUB, ofis belgesi veya metin dosyası seçin.'},415);
  if(!file.size||file.size>MAX_FILE_BYTES)return json({error:'Boş olmayan, en fazla 25 MB bir dosya seçin.'},413);
  let metadata;try{const raw=String(form.get('metadata')||'{}');if(raw.length>90000)throw Error();metadata=JSON.parse(raw);}catch{return json({error:'Belge bilgileri okunamadı.'},400);}
  const data=await file.arrayBuffer();
  if(extension==='pdf'&&new TextDecoder().decode(data.slice(0,1024)).indexOf('%PDF-')<0)return json({error:'Bu dosya bir PDF gibi görünmüyor. Dosyayı kontrol edin.'},415);
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',data)),b=>b.toString(16).padStart(2,'0')).join('');
  const duplicate=await duplicateRecord(hash,env);if(duplicate)return json({book:duplicate,duplicate:true});
  let thumbnailBytes;const thumbnail=form.get('thumbnail');if(thumbnail&&typeof thumbnail.arrayBuffer==='function'&&thumbnail.size>0&&thumbnail.size<524288){const bytes=new Uint8Array(await thumbnail.arrayBuffer());if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255)thumbnailBytes=bytes;}
  const book=describeBook(cleanBook({...metadata,title:metadata.title||name.replace(/\.[^.]+$/,''),collection:'digital',reading:metadata.reading||'Not set',color:metadata.color||'forest',borrower:'',loanedAt:'',dueDate:''}));
  const bookId=crypto.randomUUID(),fileId=crypto.randomUUID(),date=new Date().toISOString(),key='digital/'+fileId+'.'+extension;
  const coverKey=thumbnailBytes?'digital/'+fileId+'-cover.jpg':null;if(coverKey){book.coverUrl='/api/digital-files/'+fileId+'/cover';book.coverSource='';book.coverTitle=book.title;book.coverAuthor=book.author;book.coverProvider='Yüklenen dosya';book.coverNote='Yüklediğiniz dosyadan alınan kapak veya ilk sayfa önizlemesi.';}
  await reserveStorage(env,fileId,file.size+(thumbnailBytes?.byteLength||0));
  try{
   await env.BUCKET.put(key,data,{httpMetadata:{contentType:DOCUMENT_TYPES[extension]},customMetadata:{fileName:name}});
   if(coverKey)await env.BUCKET.put(coverKey,thumbnailBytes,{httpMetadata:{contentType:'image/jpeg'}});
   const writes=await env.DB.batch([
    bookInsert(env,book,bookId,date),
    env.DB.prepare('INSERT INTO digital_files (id, book_id, object_key, file_name, mime, size, hash, uploaded_at, cover_key,owner_id,cover_size) SELECT ?,?,?,?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM books WHERE owner_id=? AND id=?)').bind(fileId,bookId,key,name,DOCUMENT_TYPES[extension],file.size,hash,date,coverKey,env.USER.id,thumbnailBytes?.byteLength||0,env.USER.id,bookId)
   ]);if(!changed(writes[0]))throw Object.assign(Error('Kitap sınırına ulaşıldı.'),{status:413});
  }catch(error){await env.BUCKET.delete([key,coverKey].filter(Boolean));const existing=await duplicateRecord(hash,env);if(existing)return json({book:existing,duplicate:true});throw error;}finally{await releaseStorage(env,fileId);}
  return json({book:(await attachFiles([{...book,id:bookId,createdAt:date}],env))[0],duplicate:false},201);
 }
 const match=path.match(/^\/api\/digital-files\/([a-zA-Z0-9-]{1,80})(\/cover)?$/);
 if(match&&request.method==='GET'){
  const row=await env.DB.prepare('SELECT object_key, cover_key, file_name, mime, size FROM digital_files WHERE id = ? AND owner_id=?').bind(match[1],env.USER.id).first();if(!row)return json({error:'Bu dosya artık kütüphanede yok.'},404);
  if(match[2]){if(!row.cover_key)return new Response('No cover',{status:404});const cover=await env.BUCKET.get(row.cover_key);return cover?new Response(cover.body,{headers:{'Content-Type':'image/jpeg','Cache-Control':'private, no-store'}}):new Response('No cover',{status:404});}
  const range=request.headers.get('Range');if(range&&!/^bytes=\d*-\d*$/.test(range))return new Response(null,{status:416,headers:{'Content-Range':'bytes */'+row.size}});
  let object;try{object=await env.BUCKET.get(row.object_key,range?{range:request.headers}:undefined);}catch{return new Response(null,{status:416,headers:{'Content-Range':'bytes */'+row.size}});}
  if(!object)return json({error:'Kaydedilen dosya bulunamadı.'},404);
  const inline=row.mime==='application/pdf'&&url.searchParams.get('download')!=='1';
  const filename=row.file_name.replace(/[^\x20-\x7E]|["\\]/g,'_');
  const headers=new Headers({'Content-Type':row.mime,'Content-Disposition':`${inline?'inline':'attachment'}; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(row.file_name).replace(/'/g,'%27')}`,'Content-Security-Policy':"sandbox; default-src 'none'; frame-ancestors 'none'",'Cache-Control':'private, no-store','Accept-Ranges':'bytes','X-Content-Type-Options':'nosniff'});
  let status=200;if(object.range&&range){const offset=object.range.offset??Math.max(0,row.size-object.range.suffix),length=object.range.length??object.range.suffix;headers.set('Content-Range',`bytes ${offset}-${offset+length-1}/${row.size}`);headers.set('Content-Length',String(length));status=206;}else headers.set('Content-Length',String(row.size));
  return new Response(object.body,{status,headers});
 }
 return json({error:'Not found.'},404);
}
