#!/usr/bin/env node
// Reports booleans/counts only. Never print a credential or matching artifact content.
import {readFile,readdir,realpath} from 'node:fs/promises';
import {resolve,dirname,basename} from 'node:path';
import {parseEnv} from 'node:util';
import {execFileSync} from 'node:child_process';
let local={};try{local=parseEnv(await readFile('.env.local','utf8'));}catch{}
const env={...local,...process.env};
let credentials={};try{credentials=JSON.parse(await readFile(env.GROK_BOT_CREDENTIALS_FILE||'.caretakr/grok-credentials.json','utf8'));}catch{}
let workspacePassword;try{workspacePassword=(await readFile(".caretakr/hosted-workspace-passcode.txt","utf8")).trim();}catch{}
const secrets=[workspacePassword,...Object.entries(env).filter(([key])=>/^CARETAKR_.*(?:TOKEN|SECRET|PASSWORD)$/.test(key)||/^GROK_BOT_(?:ACCESS|REFRESH)_TOKEN$/.test(key)).map(([,value])=>value),credentials.accessToken,credentials.refreshToken].filter(value=>typeof value==='string'&&value.length>=16);
let sensitiveSymlink=false;
async function walk(directory){const paths=[];for(const item of await readdir(directory,{withFileTypes:true}).catch(()=>[])){if(item.name==='dev'||item.name==='cache')continue;const path=directory+'/'+item.name;if(item.isDirectory())paths.push(...await walk(path));else if(item.isFile())paths.push(path);else if(item.isSymbolicLink()){const target=await realpath(path);if(target.includes('/.caretakr/')||basename(target).startsWith('.env'))sensitiveSymlink=true;}}return paths;}
const files=await walk('.next');
const nativeFiles=await walk('.netlify/functions');
let nativeArchiveReadable=true, nativeSensitiveFile=false;
function artifactBytes(path){
  if(!path.endsWith('.zip'))return readFile(path);
  try {
    const names=execFileSync('unzip',['-Z','-1',path],{maxBuffer:4*1024*1024,stdio:['ignore','pipe','pipe']}).toString();
    if(names.split('\n').some(name=>/(^|\/)\.caretakr(\/|$)|(^|\/)\.env(?:\.|$)/.test(name)))nativeSensitiveFile=true;
    return execFileSync('unzip',['-p',path],{maxBuffer:256*1024*1024,stdio:['ignore','pipe','pipe']});
  }catch{nativeArchiveReadable=false;return Buffer.alloc(0);}
}

const groups={client:files.filter(path=>path.startsWith('.next/static/')),server:files.filter(path=>path.startsWith('.next/server/')),other:files.filter(path=>!path.startsWith('.next/static/')&&!path.startsWith('.next/server/'))};
groups.nativeFunctions=nativeFiles;
const audit={};
for(const [name,paths]of Object.entries(groups)){let found=false;for(const path of paths){const bytes=await artifactBytes(path);if(secrets.some(secret=>bytes.includes(Buffer.from(secret))))found=true;}audit[name]={fileCount:paths.length,containsCredentialValue:found};}
const traces=files.filter(path=>path.endsWith('.nft.json'));let sensitiveTrace=false;
for(const path of traces){const trace=JSON.parse(await readFile(path,'utf8'));for(const item of trace.files||[]){const absolute=resolve(dirname(path),item);if(absolute.includes('/.caretakr/')||basename(absolute).startsWith('.env'))sensitiveTrace=true;}}
let productionBuildPresent=false;try{productionBuildPresent=!!(await readFile('.next/BUILD_ID','utf8')).trim();}catch{}
const grokCredentialAvailable=!!(credentials.accessToken||env.GROK_BOT_ACCESS_TOKEN);
const complete=productionBuildPresent&&grokCredentialAvailable&&!!env.CARETAKR_OPERATOR_TOKEN&&!!secrets.length&&!!traces.length&&!!groups.client.length;
const passed=complete&&nativeArchiveReadable&&!nativeSensitiveFile&&!sensitiveTrace&&!sensitiveSymlink&&!Object.values(audit).some(group=>group.containsCredentialValue);
console.log(JSON.stringify({passed,productionBuildPresent,grokCredentialAvailable,secretScanComplete:complete,groups:audit,traceCount:traces.length,traceReferencesSensitiveFiles:sensitiveTrace||nativeSensitiveFile,nativeArchiveReadable,sensitiveSymlink,checkedSecretCount:secrets.length,secretValuesPrinted:false},null,2));
if(!passed)process.exitCode=1;
