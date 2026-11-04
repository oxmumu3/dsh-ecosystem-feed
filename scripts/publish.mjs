import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {lstat,mkdir,open,realpath,rename,rm,writeFile} from 'node:fs/promises';
import {isAbsolute,join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {projectRoot,sha256,validatePublic} from './validate.mjs';
import {syncFeed} from './sync.mjs';
const repositoryName='oxmumu3/dsh-ecosystem-feed',identity={name:'牛村木木山',email:'157776623+oxmumu3@users.noreply.github.com'},exec=promisify(execFile);
export function parseArguments(args){if(args.length!==2||args[0]!=='--source'||!isAbsolute(args[1]??''))throw Error('Usage: npm run publish -- --source /absolute/feed-directory');return {source:args[1]};}
export function admitRepository({repository,login,remote,branch,dirty,ahead=0}){
 if(repository?.full_name!==repositoryName||repository.owner?.login!=='oxmumu3'||repository.owner?.id!==157776623||repository.visibility!=='public'||login!=='oxmumu3')throw Error('Expected the authenticated oxmumu3 account and its canonical public feed repository');
 if(!/^(?:https:\/\/github\.com\/|git@github\.com:)oxmumu3\/dsh-ecosystem-feed(?:\.git)?$/.test(remote)||branch!=='main'||dirty||ahead!==0)throw Error('Publishing requires canonical origin, clean main and no ahead/diverged commits; resolve locally without force');
}
export async function publishFeed({source}={}){
 parseArguments(['--source',source]);
 const cwd=await realpath(projectRoot),local=join(cwd,'.local');
 try{if((await lstat(local)).isSymbolicLink())throw Error('.local cannot be a symlink');}catch(error){if(error.code!=='ENOENT')throw error;}
 await mkdir(local,{recursive:true});let lock;
 try{lock=await open(join(local,'publish.lock'),'wx');}catch(error){if(error.code==='EEXIST')throw Error('Publication lock exists; inspect the running publisher before removing a stale lock');throw error;}
 const run=async(command,args,extra={})=>(await exec(command,args,{cwd,timeout:45000,maxBuffer:2097152,env:{...process.env,GIT_TERMINAL_PROMPT:'0'},...extra})).stdout;
 try{
  await lock.writeFile(JSON.stringify({pid:process.pid,startedAt:new Date().toISOString()})+'\n');
  if(await realpath((await run('git',['rev-parse','--show-toplevel'])).trim())!==cwd)throw Error('Run from the standalone public repository');
  const repository=JSON.parse(await run('gh',['api','repos/'+repositoryName,'--jq','{id,full_name,owner:{login:.owner.login,id:.owner.id},visibility}']));
  const state={repository,login:(await run('gh',['api','user','--jq','.login'])).trim(),remote:(await run('git',['remote','get-url','origin'])).trim(),branch:(await run('git',['branch','--show-current'])).trim(),dirty:await run('git',['status','--porcelain=v1','--untracked-files=all'])};
  admitRepository(state);
  await run('git',['fetch','--no-tags','origin','main']);
  const [ahead,behind]=(await run('git',['rev-list','--left-right','--count','HEAD...FETCH_HEAD'])).trim().split(/\s+/).map(Number);
  admitRepository({...state,ahead});
  if(behind)await run('git',['merge','--ff-only','FETCH_HEAD']);
  if((await run('git',['status','--porcelain=v1','--untracked-files=all'])).length)throw Error('Repository changed during preflight; inspect it before retrying');
  const synced=await syncFeed({source,destination:cwd}),checked=await validatePublic(cwd);
  if(checked.sha256!==synced.sha256)throw Error('Public feed changed after source synchronization');
  const pending=await run('git',['status','--porcelain=v1','--untracked-files=all']);
  if(pending.split('\n').filter(Boolean).some(line=>!/^(?:feed\.json|schema\.md|days\/\d{4}-\d{2}-\d{2}\.md)$/.test(line.slice(3))))throw Error('Unexpected non-data change; inspect the working tree');
  let status='unchanged';
  if(pending){
   await run('git',['add','--','feed.json','schema.md','days']);
   await run('git',['commit','-m','data: refresh ecosystem feed'],{env:{...process.env,GIT_TERMINAL_PROMPT:'0',GIT_AUTHOR_NAME:identity.name,GIT_AUTHOR_EMAIL:identity.email,GIT_COMMITTER_NAME:identity.name,GIT_COMMITTER_EMAIL:identity.email}});
   const saved=(await run('git',['rev-parse','HEAD'])).trim();
   try{await run('git',['push','origin','main']);}catch(error){throw Error('Push failed; local commit '+saved+' remains for inspection. '+error.message);}
   status='published';
  }
  const commit=(await run('git',['rev-parse','HEAD'])).trim(),receipt={status,sha256:checked.sha256,commit,itemCount:checked.itemCount,latestDay:checked.latestDay,counts:checked.counts,sourceUnchanged:synced.sourceUnchanged,publicVerified:false,checkedAt:new Date().toISOString(),repositoryId:repository.id};
  try{
   for(const ref of[commit,'main']){const response=await fetch('https://raw.githubusercontent.com/'+repositoryName+'/'+ref+'/feed.json',{signal:AbortSignal.timeout(15000),redirect:'error'});if(!response.ok||sha256(Buffer.from(await response.arrayBuffer()))!==receipt.sha256)throw Error('Anonymous public feed verification failed for '+ref);}
   receipt.publicVerified=true;
  }catch(error){receipt.error=error.message;throw error;}
  finally{const temp=join(local,'last-publish.tmp');await writeFile(temp,JSON.stringify(receipt,null,2)+'\n',{mode:0o600});await rename(temp,join(local,'last-publish.json'));}
  return receipt;
 }finally{try{await lock.close();}finally{await rm(join(local,'publish.lock'),{force:true});}}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)Promise.resolve().then(()=>publishFeed(parseArguments(process.argv.slice(2)))).then(value=>console.log(JSON.stringify(value))).catch(error=>{console.error(error.message);process.exitCode=1;});
