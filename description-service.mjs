export function describeBook(book){
 if(book.description?.trim())return book;
 if(book.contentText?.trim())return {...book,description:book.contentText.trim().slice(0,1200),descriptionKind:'Dosyadan alıntı'};
 return {...book,description:`${book.title}${book.author?' — '+book.author:''}. ${book.genre?book.genre+' kategorisinde, ':''}${book.collection==='digital'?'dijital':'fiziksel'} bir kitap. Bu baskı için ayrıntılı bir tanıtım henüz bulunamadı. Kitabı düzenleyerek açıklama ekleyebilirsiniz.`,descriptionKind:'Katalog bilgisi'};
}
