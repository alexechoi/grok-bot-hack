import {apiError,requireOperator,requireDemo} from '@/lib/server/auth';
import {emit,getInspection,registry,status} from '@/lib/server/store';
import {agents} from '@/lib/scenario';
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){try{
 const run=getInspection((await params).id);if(run.mode==='live')requireOperator(request);else requireDemo(request);
 if(run.status!=='running')return Response.json({id:run.id,cancelled:false});
 run.status='error';registry.controls.get(run.id)?.abort();registry.controls.delete(run.id);
 for(const agent of agents)if(run.agents[agent.id].state!=='Completed')status(run,agent.id,'Error','Inspection cancelled');
 emit(run,'manager','task.failed',{message:'Inspection cancelled by operator. Any already-dispatched Grok Bot task may finish independently.'});
 return Response.json({id:run.id,cancelled:true});
}catch(error){return apiError(error);}}
