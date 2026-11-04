import {describeBook} from './description-service.mjs';
import {searchCovers,normalize,validateCoverURL} from './cover-service.mjs';
const languages={en:'English',az:'Azərbaycan',tr:'Türk dili',ru:'Русский',eng:'English',aze:'Azərbaycan',tur:'Türk dili',rus:'Русский',fre:'French',fra:'French',ger:'German',deu:'German',spa:'Spanish',ara:'Arabic',ita:'Italian',por:'Portuguese'};
export function classify(subjects=''){
 const text=normalize(Array.isArray(subjects)?subjects.join(' '):subjects);
 const groups=[['Physics','Non-fiction',/physics|fizika|fizik|quantum|kuantum/],['Astronomy','Non-fiction',/astronom|cosmolog|kosmos|kosmolog/],['Psychology','Non-fiction',/psycholog|psixolog|psikolog/],['Religion & philosophy','Non-fiction',/philosoph|felsef|felsef|religio|din /],['History & politics','Non-fiction',/history|tarix|tarih|politic|siyas/],['Biography','Non-fiction',/biograph|bioqraf|bioqra|memoir/],['Technology','Non-fiction',/technology|texnolog|teknoloj|programming|engineering|muhendis/],['Business & finance','Non-fiction',/business|finance|biznes|maliyy|management/],['Poetry','Poetry',/poetry|poeziya|poem|sir /],['Languages','Reference',/grammar|vocabulary|language teaching|qrammat|ingilis dili/],['Mystery','Fiction',/mystery|detective|detektiv/],['Fantasy & science fiction','Fiction',/fantasy|science fiction|fantastik/],['Literature','Fiction',/fiction|roman|novel|literature|klassik/],['Personal development','Non-fiction',/self help|personal development|sexsi inkisaf|kisisel gelisim/]];
 const match=groups.find(([, ,pattern])=>pattern.test(text));return match?{genre:match[0],type:match[1]}:{genre:'',type:'Other'};
}
export async function lookupBooks(params,fetcher=fetch){
 const isbn=String(params.isbn||'').replace(/[\s-]/g,'');
 const editionTask=/^(?:\d{9}[\dXx]|\d{13})$/.test(isbn)?fetcher('https://openlibrary.org/api/books?'+new URLSearchParams({bibkeys:'ISBN:'+isbn,format:'json',jscmd:'data'}),{signal:AbortSignal.timeout(8000),headers:{Accept:'application/json'}}).then(async response=>{if(!response.ok)return null;const data=await response.json(),b=data['ISBN:'+isbn];if(!b)return null;return {title:String(b.title||'').slice(0,200),author:(b.authors||[]).map(a=>a.name).join(', ').slice(0,200),publisher:(b.publishers||[]).map(p=>p.name).join(', ').slice(0,200),pages:b.number_of_pages?String(b.number_of_pages):'',year:String(b.publish_date||'').match(/(?:18|19|20)\d{2}/)?.[0]||'',isbn,language:'',genre:'',coverUrl:b.cover?.large?validateCoverURL(b.cover.large.replace(/^http:/,'https:')):'',sourceUrl:validateCoverURL(b.url.replace(/^http:/,'https:'),true),provider:'Open Library',known:true};}).catch(()=>null):Promise.resolve(null);
 let data;try{data=await searchCovers(params,fetcher,{metadata:true});}catch(error){const edition=await editionTask;if(!edition)throw error;data={results:[edition],unavailable:[]};}
 const edition=await editionTask;if(edition&&!data.results.some(b=>b.isbn===edition.isbn&&b.title===edition.title))data.results.unshift(edition);
 const results=data.results.map(c=>{const inferred=classify([c.genre,...c.subjects||[]].filter(Boolean));return {...c,genre:c.genre||inferred.genre,type:c.type||inferred.type,language:languages[c.language]||c.language||'',year:/^\d{1,4}$/.test(c.year||'')?c.year:'',isbn:(c.isbn||'').slice(0,30)};});
 const exact=results.filter(c=>normalize(c.title)===normalize(params.title)&&c.author);
 const authors=new Set(exact.map(c=>normalize(c.author)));
 const requestedISBN=String(params.isbn||'').replace(/[\s-]/g,'');
 const requestedAuthor=normalize(params.author);const authorMatch=c=>!requestedAuthor||normalize(c.author).includes(requestedAuthor)||requestedAuthor.includes(normalize(c.author));
 let recommended=results.find(c=>c.known)||results.find(c=>requestedISBN&&c.isbn.replace(/[\s-]/g,'')===requestedISBN&&c.author)||((authors.size===1||requestedAuthor)?exact.find(authorMatch):null);
 if(recommended&&requestedISBN&&params.title?.trim().length>=3){const a=normalize(params.title),b=normalize(recommended.title);if(a!==b&&!a.includes(b)&&!b.includes(a))recommended=null;}
 if(recommended&&!recommended.description&&/^https:\/\/openlibrary\.org\/works\/OL\d+W$/.test(recommended.sourceUrl)){try{const response=await fetcher(recommended.sourceUrl+'.json',{signal:AbortSignal.timeout(5000),headers:{Accept:'application/json'}});if(response.ok){const work=await response.json(),description=typeof work.description==='string'?work.description:work.description?.value;if(description)recommended.description=String(description).replace(/<[^>]*>/g,' ').slice(0,5000);}}catch{}}
 const index=recommended?results.indexOf(recommended):-1;
 for(const [i,result] of results.entries())results[i]=describeBook(result);
 return {results,recommendedIndex:index,unavailable:data.unavailable};
}
