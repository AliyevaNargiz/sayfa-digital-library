import {test} from 'node:test';
import assert from 'node:assert/strict';
import {localeHint} from '../locale-service.mjs';
import worker from '../worker.mjs';
test('country hint uses trusted edge metadata and never browser-supplied country headers',async()=>{
 const spoof=new Request('https://sayfa.example/api/locale',{headers:{'CF-IPCountry':'AZ','X-Country':'AZ'}});
 assert.deepEqual(localeHint(spoof),{country:null,language:null});
 const request=new Request('https://sayfa.example/api/locale');Object.defineProperty(request,'cf',{value:{country:'AZ'}});
 const response=await worker.fetch(request,{HOSTED:true});assert.equal(response.status,200);assert.deepEqual(await response.json(),{country:'AZ',language:'az'});assert.equal(response.headers.get('Cache-Control'),'no-store');
 Object.defineProperty(spoof,'cf',{value:{country:'FR'}});assert.deepEqual(localeHint(spoof),{country:'FR',language:null});
});
