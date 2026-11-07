import {exportLibraryCSV,prepareCSVBook} from './csv-library.mjs';
import {attachFiles} from './digital-service.mjs';
import {bookInsert,changed,limits} from './quota-service.mjs';
const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'private, no-store'}});
export async function exportCSV(env){
 const {results:rows}=await env.DB.prepare('SELECT id,data,created_at FROM books WHERE owner_id=? ORDER BY created_at,id').bind(env.USER.id).all();
 const {results:categories}=await env.DB.prepare('SELECT name FROM categories WHERE owner_id=? ORDER BY name').bind(env.USER.id).all();
 const books=await attachFiles(rows.map(r=>({...JSON.parse(r.data),id:r.id,createdAt:r.created_at})),env);
 return new Response(exportLibraryCSV(books,categories),{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="sayfa-library-'+new Date().toISOString().slice(0,10)+'.csv"','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
}
const categoryKey=name=>name.normalize('NFKC').toLocaleLowerCase('tr-TR');
export async function importCSV(request,env){
 const raw=await request.text();if(raw.length>1600000)return json({error:'CSV içe aktarma paketi çok büyük.'},413);
 const input=JSON.parse(raw);if(!Array.isArray(input.books)||input.books.length>20||!Array.isArray(input.categories)||input.categories.length>100)throw Error('CSV içe aktarma paketi geçersiz.');
 const names=new Map();for(const name of input.categories){if(typeof name!=='string'||!name.trim()||name.trim().length>80)throw Error('CSV kategorileri geçersiz.');names.set(categoryKey(name.trim()),name.trim());}
 const books=[];for(const row of input.books){const {book}=prepareCSVBook(row);if(book.genre)names.set(categoryKey(book.genre),book.genre);if(!book.id){const fingerprint=JSON.stringify([book.title.normalize('NFKC').toLocaleLowerCase('tr-TR'),book.author.normalize('NFKC').toLocaleLowerCase('tr-TR'),book.isbn.replace(/[\s-]/g,''),book.collection]);const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(fingerprint));book.id='csv-'+Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('');}books.push(book);}
 const {results:existingCategories}=await env.DB.prepare('SELECT normalized FROM categories WHERE owner_id=?').bind(env.USER.id).all();const categoryKeys=new Set(existingCategories.map(c=>c.normalized));if([...names.keys()].filter(k=>!categoryKeys.has(k)).length+categoryKeys.size>100)return json({error:'En fazla 100 kategori oluşturabilirsiniz.'},413);
 const seen=new Set(),unique=books.filter(b=>{if(seen.has(b.id))return false;seen.add(b.id);return true;});let skipped=books.length-unique.length,added=0;const limited=[];
 for(const book of unique){
  if(await env.DB.prepare('SELECT id FROM books WHERE owner_id=? AND id=?').bind(env.USER.id,book.id).first()){skipped++;continue;}
  const {id,createdAt,...data}=book;const result=await bookInsert(env,data,id,createdAt||new Date().toISOString()).run();
  if(changed(result))added++;else if(await env.DB.prepare('SELECT id FROM books WHERE owner_id=? AND id=?').bind(env.USER.id,id).first())skipped++;else limited.push(id);
 }
 let categoriesAdded=0;for(const [key,name]of names){const result=await env.DB.prepare('INSERT INTO categories(id,owner_id,name,normalized) SELECT ?,?,?,? WHERE (SELECT COUNT(*) FROM categories WHERE owner_id=?)<100 ON CONFLICT(owner_id,normalized) DO NOTHING').bind(crypto.randomUUID(),env.USER.id,name,key,env.USER.id).run();categoriesAdded+=changed(result);}
 return json({added,skipped,limited,categoriesAdded,bookLimit:limits(env).bookLimit});
}
