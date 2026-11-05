import {resolve} from 'node:path';
import {startServer} from '../server.mjs';
export const startPortable=options=>startServer(options);
if(process.argv[1]&&resolve(process.argv[1])===new URL(import.meta.url).pathname){process.chdir(new URL('..',import.meta.url));const app=await startPortable();console.log(`Sayfa: ${app.url}\nKütüphane boş başlar. Veriler .data klasöründe saklanır. Durdurmak için Ctrl+C.`);}
