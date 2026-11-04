import {test} from 'node:test';
import assert from 'node:assert/strict';
import {startServer} from '../server.mjs';
import {lookupBooks} from '../metadata-service.mjs';
import {detectISBNs,photoQueries,matchPhotoBooks} from '../client/ocr-reader.mjs';
const close=async app=>{await new Promise(r=>app.server.close(r));app.db.close();};
async function request(app,path,method='GET',data){const response=await fetch(app.url+'/api/'+path,{method,headers:{'Content-Type':'application/json'},...(data===undefined?{}:{body:JSON.stringify(data)})});return {status:response.status,data:await response.json()};}
test('Necle starts empty, categories persist and rename/remove labels without deleting books',async()=>{
 const app=await startServer({port:0,dbPath:':memory:'});try{
 assert.deepEqual((await request(app,'books')).data,[]);assert.deepEqual((await request(app,'categories')).data,[]);
 const category=await request(app,'categories','POST',{name:'Tarih'});assert.equal(category.status,201);assert.equal((await request(app,'categories','POST',{name:'TARİH'})).status,409);
 const book=await request(app,'books','POST',{title:'Bir kitap',author:'Bir yazar',genre:'Tarih',publisher:'Bir yayınevi',reading:'Unread'});assert.equal(book.status,201);assert.ok(book.data.description);
 await request(app,'categories/'+category.data.id,'PUT',{name:'Tarih ve toplum'});assert.equal((await request(app,'books')).data[0].genre,'Tarih ve toplum');
 await request(app,'categories/'+category.data.id,'DELETE',{});const books=(await request(app,'books')).data;assert.equal(books.length,1);assert.equal(books[0].genre,'');assert.equal(books[0].publisher,'Bir yayınevi');
 const bad=await fetch(app.url+'/api/categories',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://evil.test'},body:JSON.stringify({name:'Kötü istek'})});assert.equal(bad.status,403);
 }finally{await close(app);}
});
test('a reviewed photo book keeps a private fallback cover through edits, and deletion removes it',async()=>{
 const app=await startServer({port:0,dbPath:':memory:'});try{const form=new FormData();form.append('metadata',JSON.stringify({title:'Küçük Prens',author:'Antoine de Saint-Exupéry',publisher:'Can Yayınları',description:'Bir dostluk hikâyesi.'}));form.append('photo',new Blob([new Uint8Array([255,216,255,224,1,2,3])],{type:'image/jpeg'}),'cover.jpg');const response=await fetch(app.url+'/api/photo-books',{method:'POST',body:form});assert.equal(response.status,201);const book=await response.json();assert.equal(book.collection,'physical');assert.match(book.coverUrl,/^\/api\/book-photos\//);assert.equal((await fetch(app.url+book.coverUrl)).status,200);const saved=await request(app,'books/'+book.id,'PUT',{...book,notes:'Benim notum'});assert.equal(saved.status,200);assert.equal((await fetch(app.url+book.coverUrl)).status,200);await request(app,'books/'+book.id,'DELETE',{});assert.equal((await fetch(app.url+book.coverUrl)).status,404);
 }finally{await close(app);}
});
test('OCR text produces ISBN and query candidates, and matching can distinguish multiple book titles',()=>{
 const text='KÜÇÜK PRENS\nAntoine de Saint-Exupery\nISBN 978-975-07-1938-7\nSUC VE CEZA\nFyodor Dostoyevski';assert.ok(detectISBNs(text).includes('9789750719387'));assert.ok(photoQueries(text).some(q=>q.includes('PRENS')));const matches=matchPhotoBooks(text,[{title:'Küçük Prens',author:'Antoine de Saint-Exupery'},{title:'Suç ve Ceza',author:'Fyodor Dostoyevski'},{title:'A Completely Different Story',author:'Unknown'}]);assert.ok(matches[0].score>.85);assert.ok(matches[1].score>.85);assert.equal(matches[2].score,0);
});
test('ISBN edition lookup supplies publisher, author and page count without a paid API',async()=>{
 const fake=async url=>String(url).includes('/api/books?')?Response.json({'ISBN:9789750719387':{title:'Küçük Prens',url:'https://openlibrary.org/books/OL123M',authors:[{name:'Antoine de Saint-Exupéry'}],publishers:[{name:'Can Yayınları'}],number_of_pages:112,publish_date:'2015',cover:{large:'https://covers.openlibrary.org/b/id/123-L.jpg'}}}):Response.json(String(url).includes('alinino')?[]:{docs:[]});
 const result=await lookupBooks({title:'',isbn:'9789750719387'},fake);assert.equal(result.recommendedIndex,0);assert.equal(result.results[0].publisher,'Can Yayınları');assert.equal(result.results[0].pages,'112');assert.equal(result.results[0].author,'Antoine de Saint-Exupéry');
});
