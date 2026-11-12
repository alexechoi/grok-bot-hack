import test, {afterEach} from 'node:test';
import assert from 'node:assert/strict';
import { useInspection, type WorkflowEvent } from '../lib/client-store';
import { createInspection, emit, recordFinding, status, registry } from '../lib/server/store';
import { demoFindings } from '../lib/scenario';

afterEach(()=>{useInspection.getState().reset();registry.runs.clear();registry.listeners.clear();});
function activeRun(){const run=createInspection('demo');useInspection.setState({inspectionId:run.id,status:'running'});return run;}

test('client hydrates actual backend agent and finding snapshots without losing visual identity',()=>{
 const run=activeRun();status(run,'inspector','Investigating','Reviewing moisture','bathroom');recordFinding(run,'inspector',demoFindings[0]);
 useInspection.getState().hydrate(run);
 const state=useInspection.getState(),scout=state.agents.find(a=>a.id==='inspector')!;
 assert.equal(scout.state,'Investigating');assert.equal(scout.roomId,'bathroom');assert.equal(scout.task,'Reviewing moisture');assert.equal(scout.color,'#579bff');
 assert.deepEqual(state.findings,[demoFindings[0]]);assert.equal(state.score,null);
});

test('late events and snapshots from a previous inspection cannot overwrite a replay',()=>{
 const previous=activeRun();recordFinding(previous,'inspector',demoFindings[0]);
 const late=emit(previous,'manager','inspection.completed',{summary:'Old report',score:62,findings:previous.findings,workOrders:[]});
 useInspection.getState().reset();const current=activeRun();
 useInspection.getState().apply(late);useInspection.getState().hydrate(previous);
 const state=useInspection.getState();assert.equal(state.inspectionId,current.id);assert.equal(state.status,'running');assert.equal(state.summary,'');assert.deepEqual(state.findings,[]);assert.deepEqual(state.events,[]);
});

test('SSE event IDs deduplicate reconnect delivery and findings remain unique',()=>{
 const run=activeRun();recordFinding(run,'inspector',demoFindings[0]);const findingEvent=run.events.at(-1)!;
 useInspection.getState().apply(findingEvent);useInspection.getState().apply(findingEvent);
 assert.equal(useInspection.getState().events.length,1);assert.equal(useInspection.getState().findings.length,1);
 const repeatedFinding={...findingEvent,id:'new-envelope-for-same-finding'};useInspection.getState().apply(repeatedFinding);
 assert.equal(useInspection.getState().findings.length,1);
});

test('reconnect to failed inspection reconstructs a visible error from snapshot history',()=>{
 const run=activeRun();run.status='error';emit(run,'manager','task.failed',{message:'Grok Bot response timed out. Check the connection.'});
 useInspection.getState().hydrate(run);
 assert.equal(useInspection.getState().status,'error');assert.match(useInspection.getState().error!,/timed out/);
});

test('actual movement and completion payloads map to scene state and report outputs',()=>{
 const run=activeRun();const movement=emit(run,'energy','agent.moving',{state:'Moving',task:'Checking readings'},'kitchen');
 useInspection.getState().apply(movement);const watt=useInspection.getState().agents.find(a=>a.id==='energy')!;
 assert.equal(watt.roomId,'kitchen');assert.equal(watt.state,'Moving');assert.equal(watt.task,'Checking readings');
 const finished=emit(run,'manager','inspection.completed',{summary:'Sourced plan EV-001',score:85,findings:[demoFindings[0]],workOrders:[]});
 useInspection.getState().apply(finished);const state=useInspection.getState();
 assert.equal(state.status,'completed');assert.equal(state.score,85);assert.equal(state.summary,'Sourced plan EV-001');assert.deepEqual(state.findings,[demoFindings[0]]);
});

test('event history stays bounded without discarding findings or final report state',()=>{
 const run=activeRun();
 for(let i=0;i<510;i++){
  const e:WorkflowEvent={id:`event-${i}`,inspectionId:run.id,timestamp:new Date().toISOString(),agentId:'manager',type:'agent.status',payload:{task:'Working',state:'Reporting'}};
  useInspection.getState().apply(e);
 }
 assert.equal(useInspection.getState().events.length,500);assert.equal(useInspection.getState().events[0].id,'event-10');
});
