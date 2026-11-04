import catalogue from './data/catalogue.json' with {type:'json'};
import researched from './data/researched-covers.json' with {type:'json'};
const searchCache = new Map();
const imageHosts = new Set(['cdn.insales-shop.ru', 'covers.openlibrary.org']);
const sourceHosts = new Set(['alinino.az', 'www.alinino.az', 'openlibrary.org','www.pankitap.com','www.preslib.az','www.kitapyurdu.com','www.tdk.com.tr','yayinlar.tubitak.gov.tr','books.google.com','parlaqimzalar.az','www.ginkokitap.com','destekdukkan.com','www.koganpage.com','www.sehadetkitap.com','www.libraff.az']);
export function validateCoverURL(value, source = false) {
 if (!value) return '';
 if(!source&&/^\/api\/book-photos\/[a-zA-Z0-9-]{1,80}$/.test(value))return value;
 if(!source&&/^\/api\/digital-files\/[a-zA-Z0-9-]{1,80}\/cover$/.test(value))return value;
 if(!source&&/^\/covers\/ahmed-collection-\d{3}\.jpg$/.test(value))return value;
 let url; try { url = new URL(value); } catch { throw Error('Arama sonuçlarından bir kapak seçin.'); }
 if (url.protocol !== 'https:' || url.username || url.password || url.port || !(source ? sourceHosts : imageHosts).has(url.hostname)) throw Error('Arama sonuçlarından bir kapak seçin.');
 if (!source && url.hostname === 'covers.openlibrary.org' && !/^\/b\/(?:id\/\d+|isbn\/[\dXx-]{10,17})-[SML]\.jpg$/.test(url.pathname)) throw Error('Kapak görseli geçersiz.');
 if (!source && url.hostname === 'cdn.insales-shop.ru' && !/^\/(?:images\/products\/|r\/)/.test(url.pathname)) throw Error('Kapak görseli geçersiz.');
 return url.href;
}
export const normalize = value => String(value || '').toLocaleLowerCase().replace(/[əıöüçşğ]/g, c => ({ə:'e',ı:'i',ö:'o',ü:'u',ç:'c',ş:'s',ğ:'g'}[c])).normalize('NFKD').replace(/\p{M}/gu,'').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
function relevance(candidate, title, author) {
 const t=normalize(title), ct=normalize(candidate.title), a=normalize(author), ca=normalize(candidate.author);
 const words=t.split(' ').filter(Boolean), overlap=words.filter(w=>ct.split(' ').includes(w)).length/Math.max(words.length,1);
 return (t===ct?10:ct.includes(t)?7:overlap*6)+(a&&ca.includes(a)?3:a&&a.split(' ').some(w=>w.length>3&&ca.includes(w))?1:0);
}
async function fetchJSON(url, fetcher) {
 const response=await fetcher(url,{headers:{Accept:'application/json','User-Agent':'NecleLibrary/1.0 (personal book cover search)'},signal:AbortSignal.timeout(9000)});
 if(!response.ok)throw Error('Catalogue unavailable.');
 const text=await response.text();if(text.length>2500000)throw Error('Catalogue response too large.');
 return JSON.parse(text);
}
export async function searchCovers({title='',author='',isbn=''},fetcher=fetch,{metadata=false}={}) {
 title=title.trim();author=author.trim();isbn=isbn.replace(/[\s-]/g,'');
 if(isbn&&!/^(?:\d{9}[\dXx]|\d{13})$/.test(isbn))isbn='';
 if(title.length>200||author.length>200||isbn.length>13)throw Error('Daha kısa bir kitap veya yazar adıyla arayın.');
 if(title.length<3&&!/^(?:\d{9}[\dXx]|\d{13})$/.test(isbn))return {results:[],unavailable:[]};
 const known=researched.filter(c=>normalize(c.title)===normalize(title)&&(!author||normalize(c.author)===normalize(author))).map(c=>{const b=catalogue.find(b=>b.id===c.id);return {title:metadata?c.title:c.coverTitle,author:metadata?c.author:c.coverAuthor,language:c.coverLanguage,genre:b?.genre||'',type:b?.type||'Other',year:b?.year||'',isbn:b?.isbn||'',coverUrl:c.coverUrl,sourceUrl:c.coverSource,provider:c.coverProvider,known:true};});
 const key=JSON.stringify([title,author,isbn,metadata]);const cached=searchCache.get(key);
 if(fetcher===fetch&&cached&&Date.now()-cached.time<3600000)return cached.result;
 const shopQuery=isbn||title;
 const olQuery=new URLSearchParams({limit:'12',fields:'key,title,author_name,cover_i,language,first_publish_year,isbn,subject,publisher,number_of_pages_median'});
 if(isbn)olQuery.set('q','isbn:'+isbn);else olQuery.set('q',[title,author].filter(Boolean).join(' '));
 const names=['Ali & Nino','Open Library'];
 const settled=await Promise.allSettled([
  fetchJSON('https://alinino.az/search.json?q='+encodeURIComponent(shopQuery),fetcher).then(products=>{
   if(!Array.isArray(products))throw Error('Catalogue response invalid.');
   return products.slice(0,20).flatMap(p=>{
    const properties=new Map((p.properties||[]).map(x=>[x.id,x.permalink]));
    const values={};for(const c of p.characteristics||[])(values[properties.get(c.property_id)]??=[]).push(c.title);
    const image=p.first_image?.large_url||p.first_image?.medium_url;
    if(!image&&!metadata)return [];
    try{return [{description:metadata?String(p.short_description||p.description||'').replace(/<[^>]*>/g,' ').slice(0,5000):'',title:String(p.title||'').slice(0,200),author:(values.avtor||[]).join(', ').slice(0,200),language:(values.yazik||[]).join(', ').slice(0,60),publisher:(values.izdatelstvo||[]).join(', ').slice(0,200),genre:(values.zhanr||[]).join(', ').slice(0,80),year:(Object.entries(values).find(([k])=>/god|year|il-/.test(k))?.[1]?.[0]||'').match(/(?:18|19|20)\d{2}/)?.[0]||'',isbn:(values.isbn||[]).find(v=>/^(?:\d{9}[\dXx]|\d{13})$/.test(v.replace(/[\s-]/g,'')))||'',coverUrl:image?validateCoverURL(image.replace(/^http:/,'https:')):'',sourceUrl:validateCoverURL(new URL(p.url,'https://alinino.az').href,true),provider:'Ali & Nino'}];}catch{return [];}
   });
  }),
  fetchJSON('https://openlibrary.org/search.json?'+olQuery,fetcher).then(data=>(data.docs||[]).filter(d=>(metadata||Number.isSafeInteger(d.cover_i)&&d.cover_i>0)&&/^\/works\/OL\d+W$/.test(d.key)).map(d=>({title:String(d.title||'').slice(0,200),author:(d.author_name||[]).join(', ').slice(0,200),language:metadata?(d.language||[]).slice(0,1).join(''):'',publisher:(d.publisher||[]).slice(0,1).join(''),pages:d.number_of_pages_median?String(d.number_of_pages_median):'',subjects:(d.subject||[]).slice(0,30),year:d.first_publish_year?String(d.first_publish_year):'',isbn:(isbn&&(d.isbn||[]).includes(isbn)?isbn:(d.isbn||[]).find(v=>/^\d{13}$/.test(v)))||'',coverUrl:d.cover_i?`https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg?default=false`:'',sourceUrl:'https://openlibrary.org'+d.key,provider:'Open Library'})))
 ]);
 const unavailable=settled.flatMap((r,i)=>r.status==='rejected'?[names[i]]:[]);
 if(unavailable.length===names.length&&!known.length)throw Error('Çevrimiçi kataloglara şu anda ulaşılamıyor. Kitabı elle kaydedip kapağı daha sonra arayabilirsiniz.');
 const seen=new Set();const results=[...known,...settled.flatMap(r=>r.status==='fulfilled'?r.value:[])].sort((a,b)=>relevance(b,title,author)-relevance(a,title,author)).filter(c=>{const identity=c.coverUrl||c.sourceUrl;if(seen.has(identity))return false;seen.add(identity);return true;}).slice(0,12);
 const result={results,unavailable};
 if(fetcher===fetch){if(searchCache.size>=100)searchCache.delete(searchCache.keys().next().value);searchCache.set(key,{time:Date.now(),result});}
 return result;
}
export async function fetchCoverImage(value,fetcher=fetch) {
 const url=validateCoverURL(value);if(!url)return new Response('Not found',{status:404});
 let response,current=url;
 for(let redirects=0;redirects<4;redirects++){
  response=await fetcher(current,{headers:{Accept:'image/jpeg,image/png,image/webp,image/gif','User-Agent':'NecleLibrary/1.0 (personal book cover display)'},redirect:'manual',signal:AbortSignal.timeout(12000)});
  if(![301,302,303,307,308].includes(response.status))break;
  const location=response.headers.get('Location');if(!location)return new Response('Cover unavailable',{status:404});
  const next=new URL(location,current);
  if(next.protocol!=='https:'||next.username||next.password||next.port||!(next.hostname==='covers.openlibrary.org'||next.hostname.endsWith('.archive.org')||next.hostname==='archive.org'))return new Response('Cover unavailable',{status:404});
  current=next.href;
 }

 if(!response.ok)return new Response('Cover unavailable',{status:404});
 const type=response.headers.get('Content-Type')?.split(';')[0].trim();
 if(!['image/jpeg','image/png','image/webp','image/gif'].includes(type)||Number(response.headers.get('Content-Length')||0)>2500000)return new Response('Cover unavailable',{status:415});
 const data=await response.arrayBuffer();if(data.byteLength>2500000)return new Response('Cover too large',{status:413});
 return new Response(data,{headers:{'Content-Type':type,'Cache-Control':'private, max-age=86400','X-Content-Type-Options':'nosniff'}});
}
