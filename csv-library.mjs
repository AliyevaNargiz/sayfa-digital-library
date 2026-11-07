import {cleanBook} from './book-data.mjs';
import {validateCoverURL} from './cover-service.mjs';
export const MAX_CSV_BYTES=20*1024*1024;
const fields={id:'id',title:'title',author:'author',isbn:'isbn',publisher:'publisher',published_year:'year',pages:'pages',language:'language',category:'genre',type:'type',format:'collection',reading_status:'reading',location:'location',description:'description',notes:'notes',borrower:'borrower',loaned_at:'loanedAt',due_date:'dueDate',cover_url:'coverUrl',cover_source:'coverSource',cover_title:'coverTitle',cover_author:'coverAuthor',cover_language:'coverLanguage',cover_provider:'coverProvider',cover_note:'coverNote',cover_color:'color',metadata_status:'metadataStatus',created_at:'createdAt',content_text:'contentText'};
export const CSV_COLUMNS=['source_app','csv_version','record_type',...Object.keys(fields),'attachment_count','attachment_names','categories_json'];
const normalize=s=>String(s||'').trim().toLocaleLowerCase('tr-TR').normalize('NFKD').replace(/\p{M}/gu,'').replace(/ı/g,'i').replace(/ə/g,'e').replace(/[^\p{L}\p{N}]+/gu,'');
const aliases={};
for(const [key,value]of Object.entries(fields))aliases[normalize(key)]=value;
for(const [key,list]of Object.entries({title:['book title','kitabın adı','kitap adı','название','название книги'],author:['authors','yazar','müəllif','автор'],isbn:['isbn13','isbn 13'],year:['year','publication year','nəşr ili','yayın yılı','год издания'],genre:['genre','bookshelves','shelf','kateqoriya','kategori','категория'],reading:['reading','exclusive shelf','status','oxu vəziyyəti','okuma durumu','статус чтения'],collection:['collection','format','biçim','формат'],publisher:['nəşriyyat','yayınevi','издательство'],description:['təsvir','açıklama','описание'],notes:['my notes','qeydlər','notlar','заметки'],pages:['page count','number of pages','səhifə sayı','sayfa sayısı'],language:['dil','язык'],location:['rəf','raf','место']}))for(const name of list)aliases[normalize(name)]=key;
const dangerous=value=>/^[\s]*[=+\-@]/u.test(value)||/^[\t\r\n]/.test(value)||value.startsWith("'");
const protect=value=>{const text=String(value??'');return dangerous(text)?"'"+text:text;};
const unprotect=value=>value.startsWith("'")&&dangerous(value.slice(1))?value.slice(1):value;
const cell=value=>'"'+protect(value).replaceAll('"','""')+'"';
export function exportLibraryCSV(books,categories=[]){
 const names=[...new Set(categories.map(c=>typeof c==='string'?c:c.name).filter(Boolean))];
 const rows=(books.length?books:[null]).map((book,index)=>{
  const data={source_app:'Sayfa',csv_version:'1',record_type:book?'book':'library',categories_json:index===0?JSON.stringify(names):''};
  if(book){for(const [column,key]of Object.entries(fields))data[column]=book[key]??'';data.attachment_count=book.files?.length||0;data.attachment_names=JSON.stringify((book.files||[]).map(f=>f.name));}
  return CSV_COLUMNS.map(key=>cell(data[key]??'')).join(',');
 });
 return '\uFEFF'+CSV_COLUMNS.map(cell).join(',')+'\r\n'+rows.join('\r\n')+'\r\n';
}
function records(text){
 if(typeof text!=='string'||new TextEncoder().encode(text).byteLength>MAX_CSV_BYTES)throw Error('CSV dosyası en fazla 20 MB olabilir.');
 text=text.replace(/^\uFEFF/,'');let quoted=false,counts={',':0,';':0,'\t':0};
 for(let i=0;i<text.length;i++){const ch=text[i];if(ch==='"'){if(quoted&&text[i+1]==='"'){i++;continue;}quoted=!quoted;}if(!quoted){if(ch==='\r'||ch==='\n')break;if(ch in counts)counts[ch]++;}}
 const delimiter=Object.keys(counts).sort((a,b)=>counts[b]-counts[a])[0];
 const rows=[];let row=[],value='',state='start',line=1,start=1;
 const field=()=>{row.push(value);value='';state='start';if(row.length>100)throw Error('CSV dosyasında çok fazla sütun var.');};
 const record=()=>{field();if(row.some(v=>v.trim()))rows.push({cells:row,line:start});row=[];start=line;if(rows.length>1102)throw Error('Bir CSV dosyasında en fazla 1000 kitap olabilir.');};
 for(let i=0;i<text.length;i++){
  const ch=text[i];
  if(state==='quoted'){if(ch==='"'){if(text[i+1]==='"'){value+='"';i++;}else state='closed';}else{value+=ch;if(ch==='\n')line++;}continue;}
  if(ch===delimiter){field();continue;}
  if(ch==='\r'||ch==='\n'){if(ch==='\r'&&text[i+1]==='\n')i++;line++;record();continue;}
  if(ch==='"'){if(state!=='start')throw Error('CSV tırnak işaretleri geçersiz.');state='quoted';continue;}
  if(state==='closed'){if(ch===' '||ch==='\t')continue;throw Error('CSV tırnak işaretleri geçersiz.');}
  value+=ch;state='plain';
 }
 if(state==='quoted')throw Error('CSV tırnak işaretleri geçersiz.');if(value||row.length)record();return rows;
}
const readings={notset:'Not set',unset:'Not set',unread:'Unread',toread:'Unread',reading:'Reading',currentlyreading:'Reading',read:'Read',oxunacaq:'Unread',oxunur:'Reading',oxunub:'Read',okunacak:'Unread',okunuyor:'Reading',okundu:'Read',хочупрочитать:'Unread',читаю:'Reading',прочитано:'Read'};
const formats={physical:'physical',fiziki:'physical',fiziksel:'physical',paperback:'physical',hardcover:'physical',бумажная:'physical',digital:'digital',reqemsal:'digital',dijital:'digital',ebook:'digital',pdf:'digital',epub:'digital',цифровая:'digital'};
export function prepareCSVBook(input){
 const source={...input},reading=String(source.reading||'').trim(),collection=String(source.collection||'').trim();
 source.reading=reading?(readings[normalize(reading)]||reading):'Not set';
 if(collection&&!formats[normalize(collection)])throw Error('CSV kitap biçimi tanınmadı. physical veya digital kullanın.');
 source.collection=collection?formats[normalize(collection)]:'physical';source.type=source.type||'Other';
 let missingCover=false;
 for(const key of ['coverUrl','coverSource'])if(source[key]){try{if(source[key].startsWith('/'))throw Error();source[key]=validateCoverURL(source[key],key==='coverSource');}catch{source[key]='';missingCover=true;}}
 const clean=cleanBook(source);const id=String(input.id||'');if(id&&!/^[a-zA-Z0-9-]{1,80}$/.test(id))throw Error('CSV kitap kimliği geçersiz.');
 const createdAt=String(input.createdAt||'');if(createdAt&&!Number.isFinite(Date.parse(createdAt)))throw Error('Geçerli bir tarih girin.');
 return {book:{...clean,id,createdAt:createdAt?new Date(createdAt).toISOString():''},missingCover};
}
export function parseLibraryCSV(text){
 const rows=records(text);if(!rows.length)throw Error('CSV dosyası boş.');const headers=rows.shift().cells.map(h=>normalize(h));
 const keys=headers.map(h=>aliases[h]||(['sourceapp','csvversion','recordtype','categoriesjson','attachmentcount','attachmentnames'].includes(h)?h:null));
 if(!keys.includes('title'))throw Error('CSV dosyasında title veya Kitap adı sütunu olmalıdır.');
 const recognized=keys.filter(Boolean);if(new Set(recognized).size!==recognized.length)throw Error('CSV dosyasında yinelenen sütun adları var.');
 const result={books:[],categories:[],errors:[],missingCovers:0,attachments:0};let bookRows=0;
 for(const row of rows){try{
  if(row.cells.length>headers.length)throw Error('CSV satırındaki sütun sayısı başlıkla eşleşmiyor.');
  const data={};keys.forEach((key,i)=>{if(key)data[key]=row.cells[i]||'';});
  const own=data.sourceapp==='Sayfa'&&data.csvversion==='1';if(own)for(const key of Object.keys(data))data[key]=unprotect(data[key]);
  if(data.categoriesjson){const names=JSON.parse(data.categoriesjson);if(!Array.isArray(names)||names.some(n=>typeof n!=='string'||!n.trim()||n.trim().length>80))throw Error('CSV kategorileri geçersiz.');result.categories.push(...names.map(n=>n.trim()));}
  if(data.recordtype==='library')continue;
  if(++bookRows>1000)throw Error('Bir CSV dosyasında en fazla 1000 kitap olabilir.');
  const prepared=prepareCSVBook(data);result.books.push({...prepared.book,csvLine:row.line});result.missingCovers+=Number(prepared.missingCover);result.attachments+=Math.max(0,Math.min(10000,Number(data.attachmentcount)||0));
  if(prepared.book.genre)result.categories.push(prepared.book.genre);
 }catch(error){result.errors.push({line:row.line,error:error instanceof SyntaxError?'CSV kategorileri geçersiz.':error.message});}}
 if(bookRows>1000)throw Error('Bir CSV dosyasında en fazla 1000 kitap olabilir.');
 result.categories=[...new Set(result.categories)];if(result.categories.length>100)throw Error('En fazla 100 kategori oluşturabilirsiniz.');return result;
}
export const CSV_TEMPLATE='\uFEFFtitle,author,category,format,reading_status,notes\r\n"Əli və Nino","Qurban Səid","Ədəbiyyat","physical","Unread",""\r\n';
