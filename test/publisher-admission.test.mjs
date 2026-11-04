import test from 'node:test';
import assert from 'node:assert/strict';
import {admitRepository,parseArguments} from '../scripts/publish.mjs';
const valid={repository:{full_name:'oxmumu3/dsh-ecosystem-feed',owner:{login:'oxmumu3',id:157776623},visibility:'public'},login:'oxmumu3',remote:'https://github.com/oxmumu3/dsh-ecosystem-feed.git',branch:'main',dirty:'',ahead:0};
test('accepts the verified public owner and a clean main branch',()=>{
 assert.doesNotThrow(()=>admitRepository(valid));
 assert.deepEqual(parseArguments(['--source','/tmp/shared-feed']),{source:'/tmp/shared-feed'});
});
test('rejects wrong canonical ownership, login and visibility before publication',()=>{
 for(const change of [{repository:{...valid.repository,full_name:'other/feed'}},{repository:{...valid.repository,owner:{login:'other',id:157776623}}},{repository:{...valid.repository,owner:{login:'oxmumu3',id:1}}},{repository:{...valid.repository,visibility:'private'}},{login:'other'}])assert.throws(()=>admitRepository({...valid,...change}));
});
test('rejects a changed destination, dirty branch, unpublished commits and relative source',()=>{
 for(const change of [{remote:'https://github.com/other/feed.git'},{branch:'other'},{dirty:' M README.md\n'},{ahead:1}])assert.throws(()=>admitRepository({...valid,...change}));
 for(const args of [[],['--source','relative/path'],['--source','/tmp/source','extra']])assert.throws(()=>parseArguments(args));
});
