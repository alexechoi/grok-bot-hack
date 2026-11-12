#!/usr/bin/env node
import {mkdir,writeFile} from 'node:fs/promises';
try{process.loadEnvFile('.env.local');}catch{}
const origin=process.env.CARETAKR_LOCAL_URL||'http://localhost:3000';
const headers={Authorization:'Bearer '+process.env.CARETAKR_OPERATOR_TOKEN};
try{
 let id=process.argv[process.argv.indexOf('--watch')+1];if(!process.argv.includes('--watch')){const response=await fetch(origin+'/api/inspections',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({mode:'live'})});const run=await response.json();if(!response.ok)throw new Error(run.error||'START_FAILED');id=run.id;}
 console.log(JSON.stringify({phase:'watching',id,mode:'live'}));
 const getRun=async()=>{const response=await fetch(origin+'/api/inspections/'+encodeURIComponent(id),{headers});if(!response.ok)throw new Error('SNAPSHOT_FAILED');return response.json();};
 let run=await getRun();
 if(run.status==='running'){
  const response=await fetch(origin+'/api/inspections/'+encodeURIComponent(id)+'/events',{headers,signal:AbortSignal.timeout(300000)});if(!response.ok)throw new Error('SSE_FAILED');
  const reader=response.body.getReader(),decoder=new TextDecoder();let buffer='',done=false;
  while(!done){const chunk=await reader.read();if(chunk.done)break;buffer+=decoder.decode(chunk.value,{stream:true});let end;
   while((end=buffer.indexOf('\n\n'))!==-1){const frame=buffer.slice(0,end);buffer=buffer.slice(end+2);const line=frame.split('\n').find(line=>line.startsWith('data: '));if(!line)continue;const value=JSON.parse(line.slice(6));if(!frame.includes('event: agent-event'))continue;
    console.log(JSON.stringify({timestamp:value.timestamp,agentId:value.agentId,type:value.type,task:value.payload.task||value.payload.tool||value.payload.message,source:value.payload.source}));
    if(value.type==='inspection.completed'||value.type==='task.failed'){done=true;break;}
   }
  }
  await reader.cancel();run=await getRun();
 }
 await mkdir('.caretakr',{recursive:true,mode:0o700});await writeFile(`.caretakr/live-${id}.json`,JSON.stringify(run,null,2),{mode:0o600});
 console.log(JSON.stringify({phase:run.status,id,findings:run.findings.length,workOrders:run.workOrders.length,score:run.score,events:run.events.length,receipt:`.caretakr/live-${id}.json`}));if(run.status!=='completed')process.exitCode=1;
}catch(error){console.error(JSON.stringify({phase:'failed',message:String(error?.message||'LIVE_FAILED')}));process.exitCode=1;}
