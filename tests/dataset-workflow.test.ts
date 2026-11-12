import test,{afterEach}from'node:test';
import assert from'node:assert/strict';
import{datasetContext,isVerifiedImageUrl}from'../lib/server/dataset';
import{propertyDataset,DATASET_ID}from'../lib/property-dataset';
import{createInspection,recordFinding,recordPhotoObservation,registry}from'../lib/server/store';
import{demoFindings}from'../lib/scenario';
afterEach(()=>{registry.runs.clear();registry.listeners.clear();});
test('verified dataset preserves genuine archival photos separately from simulated incidents',()=>{
 const context=datasetContext();assert.equal(context?.datasetId,DATASET_ID);
 assert.equal(context?.evidence.filter(source=>source.type==='photo'&&!source.synthetic).length,5);
 assert.ok(context?.evidence.filter(source=>source.scope==='synthetic-incident').every(source=>source.synthetic&&/not.*reference|does not assert/i.test(source.content)));
 assert.ok(!context?.evidence.some(source=>/EPC band C/.test(source.content)));
 const run=createInspection('live',context);assert.equal(run.photoObservations.length,0);assert.notEqual(run.evidence,context?.evidence);
 assert.equal(datasetContext('synthetic-apartment'),undefined);
});
test('browser image access allowlist binds exact verified image URLs only',()=>{
 assert.equal(isVerifiedImageUrl(propertyDataset.photos[0].imageUrl),true);
 assert.equal(isVerifiedImageUrl('http://localhost:3000/api/session'),false);
 assert.equal(isVerifiedImageUrl(propertyDataset.photos[0].imageUrl+'?different=true'),false);
});
test('reference pixels cannot become evidence of a simulated property defect',()=>{
 const run=createInspection('live',datasetContext());const source=propertyDataset.photos.find(photo=>photo.roomId==='hallway')!;
 assert.throws(()=>recordFinding(run,'inspector',{...demoFindings[2],evidenceIds:[source.id]}),/context only/);
 assert.throws(()=>recordFinding(run,'inspector',{...demoFindings[0],description:'The actual historic property has ceiling damage.'}),/synthetic scenario/);
 recordFinding(run,'inspector',demoFindings[0]);assert.equal(run.findings.length,1);
});
test('missing room photography is recorded as manifest unavailability, never invented vision',()=>{
 const run=createInspection('live',datasetContext());const missing=run.evidence.find(source=>source.roomId==='kitchen'&&source.photoUnavailable)!;
 const observation={id:'PO-test',roomId:'kitchen',evidenceId:missing.id,sourceUrl:missing.sourceUrl,access:'unavailable',summary:'No verified kitchen photo supplied.',limitations:missing.content,agentId:'energy',timestamp:new Date().toISOString(),provenance:{provider:'dataset-manifest',reason:missing.content}};
 assert.throws(()=>recordPhotoObservation(run,{...observation,access:'viewed'}),/cannot be marked visually/);
 recordPhotoObservation(run,observation);assert.equal(run.photoObservations[0].access,'unavailable');
 assert.equal(run.events.at(-1)?.payload.photoUnavailable,true);
});
test('photo observations require exact canonical source, evidence and real-task provenance shape',()=>{
 const run=createInspection('live',datasetContext());const photo=propertyDataset.photos[0];
 const observation={id:'PO-source',roomId:photo.roomId,evidenceId:photo.id,sourceUrl:photo.sourceUrl,access:'viewed',summary:'Fixture test for a visible room description.',limitations:'Archival context only; no current inspection or simulated defect claim.',agentId:'inspector',timestamp:new Date().toISOString(),provenance:{provider:'grok-bot-sdk',botId:'fixture',requestId:'fixture',entryId:'fixture',sourceCursor:'fixture',accessBasis:'bot-reported-visual-review',toolActivityObserved:true}};
 assert.throws(()=>recordPhotoObservation(run,{...observation,sourceUrl:'https://example.com/forged'}),/source mismatch/);
 recordPhotoObservation(run,observation);assert.equal(run.events.at(-1)?.type,'photo.observation.created');
 assert.equal(run.events.at(-1)?.payload.photoUrl,photo.localUrl);
 assert.throws(()=>recordPhotoObservation(run,{...observation,id:'PO-duplicate'}),/Duplicate/);
});
