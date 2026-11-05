(()=>{
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 if(reduced.matches||!('IntersectionObserver' in window))return;
 const observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){entry.target.classList.add('revealed');observer.unobserve(entry.target);}},{threshold:0.12});
 for(const element of document.querySelectorAll('.how-grid article,.privacy-strip')){element.classList.add('reveal-ready');observer.observe(element);}
 reduced.addEventListener?.('change',()=>{if(reduced.matches){observer.disconnect();for(const element of document.querySelectorAll('.reveal-ready'))element.classList.add('revealed');}});
})();
