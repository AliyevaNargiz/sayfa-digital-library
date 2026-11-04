import {test} from 'node:test';
import assert from 'node:assert/strict';
import {searchCovers,fetchCoverImage,validateCoverURL} from '../cover-service.mjs';
import {startServer} from '../server.mjs';
const fixture={id:1,title:'Cəld və yavaş düşünmək',url:'/product/celd-ve-yavas-dusunmek',first_image:{large_url:'https://cdn.insales-shop.ru/images/products/1/2/3/cover.jpg'},properties:[{id:1,permalink:'avtor'},{id:2,permalink:'yazik'}],characteristics:[{property_id:1,title:'Daniel Kaneman'},{property_id:2,title:'Azərbaycan'}]};
test('cover search combines catalogues and puts exact title and author matches first',async()=>{
 const seen=[];const fake=async url=>{seen.push(url);return Response.json(url.includes('alinino')?[fixture]:{docs:[{title:'Thinking, Fast and Slow',author_name:['Daniel Kahneman'],cover_i:123,key:'/works/OL123W'}]});};
 const r=await searchCovers({title:'Cəld və yavaş düşünmək',author:'Daniel Kaneman'},fake);
 assert.ok(r.results.length>=2);assert.equal(r.results[0].provider,'Ali & Nino');assert.equal(r.results[0].language,'Azərbaycan');assert.equal(r.results.find(c=>c.provider==='Open Library').coverUrl,'https://covers.openlibrary.org/b/id/123-M.jpg?default=false');assert.ok(seen.every(u=>u.startsWith('https://')));
});
test('one unavailable catalogue still returns choices; total outage is recoverable',async()=>{
 const r=await searchCovers({title:'A book'},async u=>{if(u.includes('alinino'))throw Error('offline');return Response.json({docs:[{title:'A book',author_name:['Writer'],cover_i:2,key:'/works/OL2W'}]});});assert.equal(r.results.length,1);assert.deepEqual(r.unavailable,['Ali & Nino']);
 await assert.rejects(()=>searchCovers({title:'A book'},async()=>{throw Error('offline');}),/elle kaydedip/);
 assert.deepEqual(await searchCovers({title:'ab'},async()=>{throw Error('should not fetch');}),{results:[],unavailable:[]});
});
test('image fetch accepts known cover hosts and rejects unsafe URLs and non-images',async()=>{
 for(const url of ['https://localhost/photo.jpg','http://covers.openlibrary.org/b/id/1-M.jpg','https://covers.openlibrary.org.evil.test/b/id/1-M.jpg','https://covers.openlibrary.org:8080/b/id/1-M.jpg','javascript:alert(1)','https://covers.openlibrary.org/anything','https://user:password@covers.openlibrary.org/b/id/1-M.jpg'])assert.throws(()=>validateCoverURL(url));
 const image=await fetchCoverImage('https://covers.openlibrary.org/b/id/1-M.jpg',async()=>new Response(new Uint8Array([255,216,255]),{headers:{'Content-Type':'image/jpeg'}}));assert.equal(image.status,200);assert.match(image.headers.get('Cache-Control'),/private/);
 assert.equal((await fetchCoverImage('https://covers.openlibrary.org/b/id/1-M.jpg',async()=>new Response('<html>no image</html>',{headers:{'Content-Type':'text/html'}}))).status,415);
});
test('chosen cover survives book updates, returns and JSON backup restoration',async()=>{
 const app=await startServer({port:0,dbPath:':memory:'});
 const send=async(path,method='GET',data)=>{const r=await fetch(app.url+'/api/'+path,{method,headers:{'Content-Type':'application/json'},...(data?{body:JSON.stringify(data)}:{})});return {status:r.status,data:await r.json()};};
 try{const b={title:'Thinking, Fast and Slow',author:'Daniel Kahneman',reading:'Unread',color:'forest',coverUrl:fixture.first_image.large_url,coverSource:'https://alinino.az/product/celd-ve-yavas-dusunmek',coverTitle:fixture.title,coverProvider:'Ali & Nino',coverLanguage:'Azərbaycan'};
 const created=await send('books','POST',b);assert.equal(created.status,201);assert.equal(created.data.coverUrl,b.coverUrl);
 const updated=await send('books/'+created.data.id,'PUT',{...created.data,borrower:'Alex',loanedAt:'2026-10-01'});assert.equal(updated.data.coverSource,b.coverSource);
 const backup={app:'Necle’nin Kütüphanesi',version:1,books:[updated.data]};await send('books/'+created.data.id,'DELETE',{});assert.equal((await send('import','POST',backup)).status,200);assert.equal((await send('books')).data[0].coverUrl,b.coverUrl);
 assert.equal((await send('books','POST',{...b,coverUrl:'https://evil.example/track.svg'})).status,400);
 }finally{await new Promise(r=>app.server.close(r));app.db.close();}
});
test('Open Library image redirects may reach Internet Archive but cannot reach arbitrary hosts',async()=>{
 let calls=0;const fake=async()=>{calls++;return calls===1?new Response(null,{status:302,headers:{Location:'https://ia800505.us.archive.org/view_archive.php?archive=cover.zip&file=1.jpg'}}):new Response(new Uint8Array([255,216,255]),{headers:{'Content-Type':'image/jpeg'}});};
 assert.equal((await fetchCoverImage('https://covers.openlibrary.org/b/id/1-M.jpg',fake)).status,200);assert.equal(calls,2);
 assert.equal((await fetchCoverImage('https://covers.openlibrary.org/b/id/1-M.jpg',async()=>new Response(null,{status:302,headers:{Location:'http://127.0.0.1/private'}}))).status,404);
});

test('all researched picture and source URLs are accepted by the saved-book validator',async()=>{
 const {default:records}=await import('../data/researched-covers.json',{with:{type:'json'}});
 for(const c of records){assert.ok(validateCoverURL(c.coverUrl));assert.ok(validateCoverURL(c.coverSource,true));}
});
