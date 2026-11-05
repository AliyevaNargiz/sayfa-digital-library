/* Small UI-localization layer. Never rewrites form values or user-authored content. */
(()=>{
 'use strict';
 const languages=[{code:'en',name:'English',region:'GB'},{code:'tr',name:'Türkçe',region:'TR'},{code:'az',name:'Azərbaycan dili',region:'AZ'},{code:'ru',name:'Русский',region:'RU'}];
 const messages=window.SAYFA_MESSAGES||{},column={en:0,az:1,ru:2},key='sayfa-language',supported=code=>languages.some(l=>l.code===code);
 const detect=preferences=>preferences.map(value=>String(value).toLowerCase().split(/[-_]/)[0]).find(supported)||'en';
 const detected=detect(navigator.languages?.length?[...navigator.languages]:[navigator.language||'en']);
 let saved;try{saved=localStorage.getItem(key);}catch{}
 let language=supported(saved)?saved:detected,selectedLanguage=language,observer,scheduled=false;
 const textState=new WeakMap(),attributeState=new WeakMap();
 const patterns=Object.keys(messages).filter(k=>/\{\d+\}/.test(k)).map(source=>({source,regex:new RegExp('^'+source.split(/(\{\d+\})/).map(part=>/^\{\d+\}$/.test(part)?'(.+?)':part.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('')+'$')}));
 function text(value,locale=language){
  const original=String(value??''),source=original.trim().replace(/\s+/g,' ');if(locale==='tr'||!source)return original;
  let translated=messages[source]?.[column[locale]];
  if(translated===undefined)for(const pattern of patterns){const match=source.match(pattern.regex);if(match){translated=messages[pattern.source][column[locale]].replace(/\{(\d+)\}/g,(_,n)=>match[Number(n)+1]??'');break;}}
  return translated===undefined?original:original.replace(original.trim(),translated);
 }
 const excluded='[data-user-content],[translate="no"],script,style,textarea,input,.ocr-text,#header-name,#verification-email';
 function isExcluded(element){return !!element?.closest(excluded);}
 function localize(){
  if(!document.body)return;observer?.disconnect();
  const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let node;
  while(node=walker.nextNode()){
   if(isExcluded(node.parentElement)||!node.nodeValue.trim())continue;
   const previous=textState.get(node),source=previous&&node.nodeValue===previous.rendered?previous.source:node.nodeValue,rendered=text(source);
   textState.set(node,{source,rendered});if(node.nodeValue!==rendered)node.nodeValue=rendered;
  }
  for(const element of document.querySelectorAll('[placeholder],[aria-label],[title]')){
   if(element.closest('[data-user-content],[translate="no"]'))continue;
   let state=attributeState.get(element);if(!state){state={};attributeState.set(element,state);}
   for(const name of ['placeholder','aria-label','title']){if(!element.hasAttribute(name))continue;const value=element.getAttribute(name),previous=state[name],source=previous&&value===previous.rendered?previous.source:value,rendered=text(source);state[name]={source,rendered};if(value!==rendered)element.setAttribute(name,rendered);}
  }
  document.documentElement.lang=language;document.title=text('Sayfa — Kişisel Kitaplığın');
  document.querySelector('meta[name="apple-mobile-web-app-title"]')?.setAttribute('content','Sayfa');
  observer?.observe(document.body,{childList:true,characterData:true,subtree:true,attributes:true,attributeFilter:['placeholder','aria-label','title']});
 }
 function apply(code,{persist=true}={}){
  if(!supported(code))return;language=code;selectedLanguage=code;
  if(persist)try{localStorage.setItem(key,code);saved=code;}catch{}
  localize();updateChooser();window.dispatchEvent(new CustomEvent('sayfa-language-changed',{detail:{language:code}}));
 }
 const flag=code=>`<img class="language-flag" src="/flags/${code}.svg" alt="" width="28" height="20">`;
 function updateChooser(){
  const trigger=document.getElementById('language-button'),list=document.getElementById('language-options');if(!trigger||!list)return;
  trigger.innerHTML=flag(language)+`<span>${language.toUpperCase()}</span><span aria-hidden="true" class="language-chevron">⌄</span>`;trigger.setAttribute('aria-label',text('Dil seçimi'));
  for(const input of list.querySelectorAll('input'))input.checked=input.value===selectedLanguage;
  const button=document.getElementById('language-continue');button.textContent=text('Türkçe devam et',selectedLanguage);
 }
 function choose(){selectedLanguage=language;updateChooser();const dialog=document.getElementById('language-dialog');if(!dialog.open){dialog.showModal();dialog.querySelector('input:checked')?.focus({preventScroll:true});}}
 function init(){
  const list=document.getElementById('language-options');
  list.innerHTML=languages.map(l=>`<label class="language-option">${flag(l.code)}<span lang="${l.code}" translate="no">${l.name}</span>${l.code===detected?'<small>Önerilen</small>':''}<input type="radio" name="interface-language" value="${l.code}" aria-label="${l.name}"></label>`).join('');
  list.addEventListener('change',event=>{if(event.target.matches('input')){selectedLanguage=event.target.value;updateChooser();}});
  document.getElementById('language-button').addEventListener('click',choose);
  const dialog=document.getElementById('language-dialog');
  document.getElementById('language-continue').addEventListener('click',()=>{apply(selectedLanguage);dialog.close();});
  document.getElementById('language-close').addEventListener('click',()=>{apply(language);dialog.close();});
  dialog.addEventListener('cancel',()=>apply(language));
  observer=new MutationObserver(()=>{if(scheduled)return;scheduled=true;queueMicrotask(()=>{scheduled=false;localize();});});
  apply(language,{persist:false});
  if(!supported(saved))choose();
 }
 window.SayfaI18n={text,apply,localize,detect,languages,get language(){return language;},get locale(){return {en:'en-GB',tr:'tr-TR',az:'az-AZ',ru:'ru-RU'}[language];}};
 document.documentElement.lang=language;
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
