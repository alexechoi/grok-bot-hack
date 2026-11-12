import test from'node:test';
import assert from'node:assert/strict';
import{createReport,reportHtml,type ReportInput}from'../lib/export-report';
import{datasetContext}from'../lib/server/dataset';
import{DATASET_ID,FARNSWORTH_DATASET_ID}from'../lib/dataset-registry';
const base:ReportInput={id:'test-run',mode:'demo',summary:'Synthetic scenario only.',score:62,findings:[],workOrders:[],events:[]};
test('Webster exports retain selected same-house source records without claiming public-domain image rights',()=>{
 const context=datasetContext(DATASET_ID)!;const report=createReport({...base,...context});
 assert.equal(report.referenceDataset?.id,DATASET_ID);assert.equal(report.property,'Webster House');
 assert.equal(createReport({...base,...context,propertyName:'Stale property name'}).property,'Webster House');
 assert.throws(()=>createReport({...base,...context,evidence:datasetContext(FARNSWORTH_DATASET_ID)!.evidence}),/different property/);
 assert.ok(report.evidence.filter(item=>item.type==='photo').every(item=>item.id.startsWith('WEBSTER-')));
 assert.match(report.provenance,/original.*rights|rights.*original/i);
 assert.ok(!reportHtml(report).includes('Edith Farnsworth House'));
});
test('Farnsworth fallback exports never pick up the active Webster property or photo gallery',()=>{
 const context=datasetContext(FARNSWORTH_DATASET_ID)!;const report=createReport({...base,...context});
 assert.equal(report.referenceDataset?.id,FARNSWORTH_DATASET_ID);assert.equal(report.property,'Edith Farnsworth House');
 assert.ok(report.evidence.filter(item=>item.type==='photo').every(item=>item.id.startsWith('LOC-')));
 assert.ok(!reportHtml(report).includes('Webster House'));
});
test('synthetic-only exports omit real-property reference metadata entirely',()=>{
 const report=createReport({...base,datasetId:'synthetic-apartment',propertyName:'Illustrative apartment'});
 assert.equal(report.referenceDataset,undefined);assert.equal(report.property,'Illustrative apartment');
 assert.ok(report.evidence.every(item=>item.synthetic));assert.match(report.provenance,/synthetic inspection/);
 const html=reportHtml(report);assert.ok(!html.includes('Webster House'));assert.ok(!html.includes('Edith Farnsworth House'));
});
test('downloadable HTML escapes untrusted prose and rejects active source URL schemes',()=>{
 const payload='<script>alert("fixture")</script>';
 const report=createReport({...base,summary:payload,propertyName:payload,findings:[{id:'F-test',roomId:'bathroom',category:'water',title:payload,description:payload,severity:'medium',confidence:null,evidenceIds:['EV-test'],recommendedAction:payload,agentId:'inspector',status:'new'}],evidence:[{id:'EV-test',roomId:'bathroom',type:'note',sourceName:payload,content:payload,sourceUrl:'javascript:alert(1)',synthetic:true}],events:[{id:'event-test',timestamp:new Date().toISOString(),inspectionId:'test-run',agentId:'inspector',type:'test',payload:{text:'</pre>'+payload}}]});
 const html=reportHtml(report);assert.ok(!html.includes('<script>'));assert.ok(!html.includes('href="javascript:'));assert.ok(html.includes('&lt;script&gt;'));assert.ok(html.includes("default-src 'none'"));
});
