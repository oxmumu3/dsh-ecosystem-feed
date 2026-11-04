import {lstat,open,realpath} from 'node:fs/promises';
import {constants} from 'node:fs';
import {isAbsolute,join,relative,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
export const projectRoot=fileURLToPath(new URL('../',import.meta.url));
const fail=message=>{throw Error(message);};
const text=value=>typeof value==='string'&&value.trim().length>0&&value.length<=12000;
const date=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
export const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
export const utf8=bytes=>new TextDecoder('utf-8',{fatal:true}).decode(bytes);
export function assertPublicText(value){if(/\/Users\/|file:\/\/|(?:github\.com\/|raw\.githubusercontent\.com\/|api\.github\.com\/repos\/)piggy00544(?![a-z0-9_-])|writing system\/|(?:\.\.\/)?(?:deepseek-application|interview-prep|dsh-monitor)\/|conversation-raw\.jsonl|outreach-drafts\.md/i.test(value))fail('Public content contains a private path or an obsolete own-project entry');}
export function validateFeed(feed){
 if(!feed||feed.name!=='dsh-ecosystem-feed'||feed.timezone!=='Asia/Shanghai')fail('Invalid feed name or timezone');
 if(!text(feed.updated_at)||!/^\d{4}-\d\d-\d\dT(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.test(feed.updated_at)||!date(feed.updated_at.slice(0,10))||!Number.isFinite(Date.parse(feed.updated_at)))fail('updated_at requires a valid ISO timestamp with offset');
 if(!Array.isArray(feed.days)||!feed.days.length||feed.days.length>1000||feed.days.some(day=>!date(day))||new Set(feed.days).size!==feed.days.length||!date(feed.latest_day)||!feed.days.includes(feed.latest_day))fail('Invalid days or latest_day');
 if(!Array.isArray(feed.items)||feed.items.length>20000)fail('Invalid items');
 const ids=new Set(),counts={};
 for(const item of feed.items){
  if(!item||!text(item.id)||item.id.length>200||ids.has(item.id)||!date(item.date)||!feed.days.includes(item.date)||!text(item.title)||!text(item.why))fail('Invalid or duplicate item identity, date, title or why');
  if(!Array.isArray(item.tags)||item.tags.length>32||item.tags.some(tag=>!text(tag)||tag.length>100)||new Set(item.tags).size!==item.tags.length)fail('Invalid dynamic tags');
  let url;try{url=new URL(item.url);}catch{fail('Invalid item URL');}
  if(typeof item.url!=='string'||/[\s\\\x00-\x1f]/.test(item.url)||!['https:','http:'].includes(url.protocol)||url.username||url.password||!url.hostname)fail('Item URL must be HTTP(S) without credentials');
  ids.add(item.id);counts[item.date]=(counts[item.date]??0)+1;
 }
 const days=[...feed.days].sort(),range=feed.coverage?.range;
 if(feed.coverage?.item_count!==feed.items.length||!Array.isArray(range)||range.length!==2||range[0]!==days[0]||range[1]!==days.at(-1))fail('Coverage count/range must match the indexed data');
 if(feed.mvp?.usage_examples!==undefined&&(!Array.isArray(feed.mvp.usage_examples)||feed.mvp.usage_examples.length>10||feed.mvp.usage_examples.some(path=>typeof path!=='string'||!/^examples\/[a-z0-9-]+\.md$/.test(path))))fail('Unsafe public example path');
 return {itemCount:feed.items.length,latestDay:feed.latest_day,counts};
}
export async function readBounded(root,path,limit=524288){
 if(isAbsolute(path)||path.split(/[\\/]/).some(part=>!part||part==='..'||part==='.')||relative(root,join(root,path)).startsWith('..'))fail('Unsafe relative file path');
 let current=root;
 for(const part of path.split('/')){current=join(current,part);if((await lstat(current)).isSymbolicLink())fail('Symlinks are not accepted: '+path);}
 const handle=await open(current,constants.O_RDONLY|constants.O_NOFOLLOW);
 try{
  const before=await handle.stat();if(!before.isFile()||before.size>limit)fail('File is not regular or exceeds the byte limit: '+path);
  const buffer=Buffer.alloc(before.size+1);let offset=0;
  while(offset<buffer.length){const {bytesRead}=await handle.read(buffer,offset,buffer.length-offset,offset);if(!bytesRead)break;offset+=bytesRead;}
  const after=await handle.stat();if(before.size!==offset||after.size!==before.size||after.mtimeMs!==before.mtimeMs)fail('Source changed during reading: '+path);
  const bytes=buffer.subarray(0,offset);return {bytes,sha256:sha256(bytes),mtimeMs:after.mtimeMs,size:after.size,ino:after.ino};
 }finally{await handle.close();}
}
export async function validatePublic(directory=projectRoot){
 const root=await realpath(directory);if((await lstat(directory)).isSymbolicLink())fail('Public root cannot be a symlink');
 const record=await readBounded(root,'feed.json',4194304),feed=JSON.parse(utf8(record.bytes)),summary=validateFeed(feed);
 const files=['README.md','SUBSCRIBE.md','schema.md',...feed.days.map(day=>'days/'+day+'.md'),...(feed.mvp?.usage_examples??[])];
 assertPublicText(utf8(record.bytes));for(const path of files)assertPublicText(utf8((await readBounded(root,path)).bytes));
 return {...summary,sha256:record.sha256,files:files.length+1};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)validatePublic().then(value=>console.log(JSON.stringify(value))).catch(error=>{console.error(error.message);process.exitCode=1;});
