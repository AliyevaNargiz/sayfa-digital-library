import {validateCoverURL} from './cover-service.mjs';
export function cleanBook(input) {
 if(!input || typeof input!=='object' || Array.isArray(input)) throw Error('Geçerli bir kitap kaydı girin.');
 const limits={publisher:200,pages:10,description:5000,contentText:50000,title:200,author:200,genre:80,type:40,language:60,location:120,isbn:30,notes:5000,borrower:160,loanedAt:10,dueDate:10,year:4,coverUrl:2048,coverSource:2048,coverTitle:200,coverAuthor:200,coverLanguage:60,coverProvider:40,coverNote:200};
 const b={}; for(const [key,max] of Object.entries(limits)) { if(input[key]!=null&&typeof input[key]!=='string') throw Error('Bir alan geçersiz: '+key+'.'); b[key]=(input[key]||'').trim(); if(b[key].length>max)throw Error('Bir alan çok uzun: '+key+'.'); }
 b.coverUrl=validateCoverURL(b.coverUrl);b.coverSource=validateCoverURL(b.coverSource,true);
 if(!b.coverUrl)for(const field of ['coverSource','coverTitle','coverAuthor','coverLanguage','coverProvider','coverNote'])b[field]='';
 if(!b.title) throw Error('Kitap adı gereklidir.');
 b.collection=input.collection==='digital'?'digital':'physical';
 b.metadataStatus=['matched','file','filename','review'].includes(input.metadataStatus)?input.metadataStatus:'';
 if(b.year&&!/^\d{1,4}$/.test(b.year))throw Error('Geçerli bir yayın yılı girin.');
 if(!['Not set','Unread','Reading','Read'].includes(input.reading)) throw Error('Okuma durumu seçin.');
 b.reading=input.reading; b.color=['forest','wine','ochre','ink','clay','olive'].includes(input.color)?input.color:'forest';
 for(const k of ['loanedAt','dueDate'])if(b[k]&&(!/^\d{4}-\d{2}-\d{2}$/.test(b[k])||new Date(b[k]+'T00:00:00Z').toISOString().slice(0,10)!==b[k]))throw Error('Geçerli bir tarih girin.');
 if(b.dueDate&&!b.borrower)throw Error('Ödünç alan kişinin adını girin.');
 if(b.dueDate&&b.loanedAt&&b.dueDate<b.loanedAt)throw Error('İade tarihi ödünç verme tarihinden önce olamaz.');
 if(!b.borrower){b.dueDate='';b.loanedAt='';}
 return b;
}
