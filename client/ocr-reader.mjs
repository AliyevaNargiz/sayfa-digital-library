import {createWorker} from 'tesseract.js';
import {validISBN} from './file-metadata.mjs';
export function detectISBNs(text){const found=[];for(const match of String(text).matchAll(/(?:97[89][\s-]?)?\d[\d\s-]{7,20}[\dXx]/g)){const value=validISBN(match[0]);if(value&&!found.includes(value))found.push(value);}return found;}
export function photoQueries(text){
 const lines=String(text).split(/\n/).map(s=>s.replace(/[^\p{L}\p{N}\s:’'&.-]/gu,' ').replace(/\s+/g,' ').trim()).filter(s=>s.length>=4&&s.length<=160&&!/^(?:yayınları|yayinlari|yayınevi|yayinevi|baskı|baski|roman|ISBN)\b/i.test(s));
 const queries=[lines.slice(0,4).join(' '),...lines.slice(0,5)];return [...new Set(queries.map(s=>s.slice(0,200)).filter(s=>s.length>=4))].slice(0,6);
}
export function matchPhotoBooks(text,candidates){
 const normalize=s=>String(s||'').toLocaleLowerCase('tr-TR').normalize('NFKD').replace(/\p{M}/gu,'').replace(/ı/g,'i').replace(/[^\p{L}\p{N}]+/gu,' '),ocr=normalize(text);
 const seen=new Set();return candidates.map(book=>{const words=normalize(book.title).split(' ').filter(w=>w.length>2),hits=words.filter(w=>ocr.includes(w));const author=normalize(book.author).split(' ').filter(w=>w.length>3);return {book,score:hits.length/Math.max(1,words.length)+(author.some(w=>ocr.includes(w))?0.3:0),words:words.length};}).sort((a,b)=>b.score-a.score).filter(item=>{const key=normalize(item.book.title+' '+item.book.author);if(seen.has(key))return false;seen.add(key);return true;});
}
export async function previewImage(file){const url=URL.createObjectURL(file);try{const img=await new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(Error('Fotoğraf açılamadı. JPEG, PNG veya WebP seçin.'));image.src=url;});const scale=Math.min(1,1800/img.width,2400/img.height),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.width*scale));canvas.height=Math.max(1,Math.round(img.height*scale));canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);const small=document.createElement('canvas'),ratio=Math.min(1,600/canvas.width,900/canvas.height);small.width=Math.round(canvas.width*ratio);small.height=Math.round(canvas.height*ratio);small.getContext('2d').drawImage(canvas,0,0,small.width,small.height);const thumbnail=await new Promise(r=>small.toBlob(r,'image/jpeg',.72));return {canvas,thumbnail};}finally{URL.revokeObjectURL(url);}}
export async function recognizePhoto(file,onProgress,signal){
 signal?.throwIfAborted();if(file.size>15*1024*1024)throw Error('Her fotoğraf en fazla 15 MB olabilir.');
 const {canvas,thumbnail}=await previewImage(file);let worker;
 const abort=()=>{if(worker)void worker.terminate();};
 try{onProgress?.(0,'Dil dosyaları hazırlanıyor…');worker=await createWorker('tur+eng',1,{workerPath:'/tesseract-worker.js',workerBlobURL:false,corePath:'https://cdn.jsdelivr.net/npm/tesseract.js-core@6.0.0',logger:message=>{if(message.status==='recognizing text')onProgress?.(Math.round((message.progress||0)*100),'Kapaktaki yazılar okunuyor…');}});signal?.throwIfAborted();signal?.addEventListener('abort',abort,{once:true});const {data}=await worker.recognize(canvas);signal?.throwIfAborted();return {text:data.text||'',confidence:data.confidence||0,thumbnail,isbn:detectISBNs(data.text),queries:photoQueries(data.text)};
 }finally{signal?.removeEventListener('abort',abort);try{await worker?.terminate();}catch{}}
}
