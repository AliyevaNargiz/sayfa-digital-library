import {build} from 'esbuild';
import {copyFile} from 'node:fs/promises';
await build({entryPoints:['client/file-metadata.mjs'],outfile:'public/file-metadata.js',bundle:true,format:'esm',platform:'browser',target:'es2022',minify:true});
await copyFile('node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs','public/pdf.worker.mjs');

await build({entryPoints:['client/ocr-reader.mjs'],outfile:'public/ocr-reader.js',bundle:true,format:'esm',platform:'browser',target:'es2022',minify:true});
await copyFile('node_modules/tesseract.js/dist/worker.min.js','public/tesseract-worker.js');
