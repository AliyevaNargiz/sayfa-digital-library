import {readFile,writeFile,mkdir,unlink} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
export function localBucket(directory){
 const memory=directory?null:new Map();const path=key=>{if(!/^digital\/[a-zA-Z0-9-]+\.[a-z0-9]+$/.test(key))throw Error('Invalid object key');return resolve(directory,key);};
 return {
  async put(key,value){const bytes=new Uint8Array(value);if(memory)memory.set(key,bytes.slice());else{await mkdir(dirname(path(key)),{recursive:true});await writeFile(path(key),bytes);}},
  async delete(keys){for(const key of Array.isArray(keys)?keys:[keys]){if(memory)memory.delete(key);else await unlink(path(key)).catch(e=>{if(e.code!=='ENOENT')throw e;});}},
  async get(key,options){let bytes;try{bytes=memory?memory.get(key):new Uint8Array(await readFile(path(key)));}catch(e){if(e.code==='ENOENT')return null;throw e;}if(!bytes)return null;
   const size=bytes.length;const range=options?.range?.get('Range');if(!range)return {body:bytes,size};
   const m=range.match(/^bytes=(\d*)-(\d*)$/);if(!m||!m[1]&&!m[2])throw Error('Invalid range');
   const start=m[1]?Number(m[1]):Math.max(0,size-Number(m[2])),end=m[1]?(m[2]?Math.min(size-1,Number(m[2])):size-1):size-1;
   if(start>=size||end<start)throw Error('Invalid range');return {body:bytes.slice(start,end+1),size,range:{offset:start,length:end-start+1}};
  }
 };
}
