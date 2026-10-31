import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const source=new URL('../components/obo/runtime/',import.meta.url);
const targets=[new URL('../../syslab-backend/obo-runtime/',import.meta.url),new URL('../../syslab-infra/grader/obo_runtime/',import.meta.url)];
const files=['index.mjs','contracts.mjs','validation.mjs','cpu.mjs','memory.mjs','flows.mjs','synchronization.mjs','document.mjs','checker.mjs'];
const manifest={modelVersion:1,files:{}};
const check=process.argv.includes('--check');
for(const file of files){
  const bytes=await readFile(new URL(file,source));
  manifest.files[file]=createHash('sha256').update(bytes).digest('hex');
  for(const target of targets){
    if(check){if(!(await readFile(new URL(file,target))).equals(bytes))throw Error(`Shared OBO runtime mismatch: ${target.pathname}${file}`);}
    else{await mkdir(target,{recursive:true});await writeFile(new URL(file,target),bytes);}
  }
}
const release=JSON.stringify(manifest,null,2)+'\n';
for(const target of targets){
  if(check){if(await readFile(new URL('manifest.json',target),'utf8')!==release)throw Error('OBO manifest mismatch');}
  else await writeFile(new URL('manifest.json',target),release);
}
console.log(`OBO runtime ${check?'verified':'exported'}: ${files.length} identical files in browser, backend and grader.`);
