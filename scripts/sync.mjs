import {lstat,realpath,mkdir,mkdtemp,writeFile,rename,rm} from 'node:fs/promises';
import {basename,dirname,isAbsolute,join,relative,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {projectRoot,readBounded,utf8,assertPublicText,validateFeed} from './validate.mjs';
async function canonical(path){try{return await realpath(path);}catch(error){if(error.code!=='ENOENT')throw error;return join(await canonical(dirname(path)),basename(path));}}
const contains=(parent,child)=>{const rel=relative(parent,child);return !rel||!isAbsolute(rel)&&rel!=='..'&&!rel.startsWith('../');};
async function targetSafe(root,path){let current=root;for(const part of path.split('/')){current=join(current,part);try{if((await lstat(current)).isSymbolicLink())throw Error('Destination symlink rejected: '+path);}catch(error){if(error.code!=='ENOENT')throw error;}}}
export async function syncFeed({source,destination=projectRoot}={}){
 if(!isAbsolute(source??'')||!isAbsolute(destination))throw Error('Source and destination must be absolute directories');
 if((await lstat(source)).isSymbolicLink())throw Error('Source root symlink rejected');
 const src=await realpath(source),dest=await canonical(destination);
 if(contains(src,dest)||contains(dest,src))throw Error('Source and destination must be separate, with no ancestor relationship');
 try{if((await lstat(destination)).isSymbolicLink())throw Error('Destination root symlink rejected');}catch(error){if(error.code!=='ENOENT')throw error;}
 const records=new Map(),initial=await readBounded(src,'feed.json',4194304),feed=JSON.parse(utf8(initial.bytes)),summary=validateFeed(feed);
 records.set('feed.json',initial);
 for(const path of ['schema.md',...feed.days.map(day=>'days/'+day+'.md')])records.set(path,await readBounded(src,path));
 let total=0;
 for(const [path,record]of records){total+=record.size;if(total>16777216)throw Error('Snapshot exceeds 16 MiB');assertPublicText(utf8(record.bytes));const after=await readBounded(src,path,path==='feed.json'?4194304:524288);if(['sha256','mtimeMs','size','ino'].some(key=>record[key]!==after[key]))throw Error('Source changed while staging: '+path);}
 const changed=[];
 for(const [path,record]of records){await targetSafe(dest,path);try{if((await readBounded(dest,path,path==='feed.json'?4194304:524288)).sha256===record.sha256)continue;}catch(error){if(error.code!=='ENOENT')throw error;}changed.push(path);}
 if(changed.length){
  await targetSafe(dest,'.local');await mkdir(join(dest,'.local'),{recursive:true});const stage=await mkdtemp(join(dest,'.local','sync-'));
  try{for(const [i,path]of changed.entries()){const temp=join(stage,String(i));await writeFile(temp,records.get(path).bytes);await mkdir(dirname(join(dest,path)),{recursive:true});await rename(temp,join(dest,path));}}
  finally{await rm(stage,{recursive:true,force:true});}
 }
 return {...summary,sha256:initial.sha256,changed,sourceUnchanged:true};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){const args=process.argv.slice(2);if(args.length!==2||args[0]!=='--source'){console.error('Usage: npm run sync -- --source /absolute/feed-directory');process.exitCode=1;}else syncFeed({source:args[1]}).then(value=>console.log(JSON.stringify(value))).catch(error=>{console.error(error.message);process.exitCode=1;});}
