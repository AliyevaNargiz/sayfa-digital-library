import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
const files=await Promise.all(['index.html','messages.js','i18n.js'].map(n=>readFile(new URL('../public/'+n,import.meta.url),'utf8')));
async function setup({languages=['en-GB'],saved}={}){
 const dom=new JSDOM(files[0],{url:'https://sayfa.example/',runScripts:'outside-only'}),w=dom.window;
 Object.defineProperty(w.navigator,'languages',{value:languages});w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};
 if(saved)w.localStorage.setItem('sayfa-language',saved);
 w.eval(files[1]);w.eval(files[2]);w.document.dispatchEvent(new w.Event('DOMContentLoaded'));await new Promise(r=>setTimeout(r,0));return {dom,w,d:w.document};
}
test('language detection supports region/script tags, remembers explicit choices and falls back to English',async()=>{
 const c=await setup({languages:['az-Latn-AZ','en']});try{
  assert.equal(c.d.documentElement.lang,'az');assert.equal(c.d.getElementById('language-dialog').open,true);assert.equal(c.d.querySelector('#language-options input:checked').value,'az');
  assert.equal(c.d.querySelectorAll('.language-option .language-flag').length,4);assert.equal(c.d.querySelector('[data-route="library"]').textContent,'Kitabxanam');
  c.d.querySelector('#language-options input[value="ru"]').click();c.d.getElementById('language-continue').click();await new Promise(r=>setTimeout(r,0));assert.equal(c.d.documentElement.lang,'ru');assert.equal(c.w.localStorage.getItem('sayfa-language'),'ru');assert.equal(c.d.getElementById('language-dialog').open,false);
  assert.equal(c.w.SayfaI18n.detect(['fr-CA','de-DE']),'en');assert.equal(c.w.SayfaI18n.detect(['fr','tr-TR']),'tr');
 }finally{c.dom.window.close();}
 const second=await setup({languages:['az-AZ'],saved:'en'});try{assert.equal(second.d.documentElement.lang,'en');assert.equal(second.d.getElementById('language-dialog').open,false);}finally{second.dom.window.close();}
});
test('switching languages updates live UI and attributes, keeps form values/category IDs and user content intact',async()=>{
 const c=await setup({saved:'en'});try{
  const {d,w}=c;d.getElementById('books').innerHTML='<button class="book-title" data-user-content>Kitap adı</button><p class="author" data-user-content>Yazar</p>';
  d.getElementById('category-filter').innerHTML='<option value="">Tüm kategoriler</option><option data-user-content value="Fizik">Fizik</option>';d.getElementById('category-filter').value='Fizik';
  d.querySelector('[name="title"]').value='Bütün kitapların.';d.getElementById('showing').textContent='12 kitaptan 2 tanesi gösteriliyor';
  await new Promise(r=>setTimeout(r,0));assert.equal(d.getElementById('showing').textContent,'Showing 2 of 12 books');assert.equal(d.getElementById('search').placeholder,'Find a book, author, or topic…');
  for(const lang of ['ru','az','tr','en']){w.SayfaI18n.apply(lang);assert.equal(d.querySelector('.book-title').textContent,'Kitap adı');assert.equal(d.querySelector('.author').textContent,'Yazar');assert.equal(d.querySelector('[name="title"]').value,'Bütün kitapların.');assert.equal(d.getElementById('category-filter').value,'Fizik');assert.equal(d.querySelector('option[value="Fizik"]').textContent,'Fizik');}
  assert.equal(d.getElementById('showing').textContent,'Showing 2 of 12 books');assert.equal(w.SayfaI18n.text('4 kitap seçildi','ru'),'Выбрано книг: 4');
  d.getElementById('showing').textContent='15 kitaptan 7 tanesi gösteriliyor';await new Promise(r=>setTimeout(r,0));assert.equal(d.getElementById('showing').textContent,'Showing 7 of 15 books');
 }finally{c.dom.window.close();}
});
test('every message has all supported translations and placeholder parity',async()=>{
 const c=await setup({saved:'en'});try{for(const [source,translations]of Object.entries(c.w.SAYFA_MESSAGES)){assert.equal(translations.length,3,source);const tokens=[...source.matchAll(/\{\d+\}/g)].map(m=>m[0]).sort();for(const translated of translations){assert.ok(translated.trim(),source);assert.deepEqual([...translated.matchAll(/\{\d+\}/g)].map(m=>m[0]).sort(),tokens,source);}}}finally{c.dom.window.close();}
});
