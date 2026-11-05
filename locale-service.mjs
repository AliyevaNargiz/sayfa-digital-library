// Coarse country metadata supplied by the hosting edge. No GPS, IP lookup, or stored location.
const countryLanguages={AZ:'az',TR:'tr',RU:'ru',GB:'en',US:'en',AU:'en',NZ:'en',IE:'en',CA:'en'};
export function localeHint(request){
 const country=String(request.cf?.country||'').toUpperCase();
 return {country:/^[A-Z]{2}$/.test(country)?country:null,language:countryLanguages[country]||null};
}
