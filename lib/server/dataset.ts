import {DATASET_ID,getPropertyDataset,referenceUseEnabled} from '../dataset-registry';
import {evidence,Evidence,rooms} from '../scenario';
import type {InspectionContext} from './store';
export const SYNTHETIC_DATASET_ID='synthetic-apartment';
export function isVerifiedImageUrl(url:string,datasetId:string=DATASET_ID){const dataset=getPropertyDataset(datasetId);return !!dataset&&referenceUseEnabled(dataset)&&dataset.photos.some(photo=>photo.imageUrl===url);}
export function verifySourceImage(url:string,result:{imageSha256:string|null;width:number|null;height:number|null},datasetId:string=DATASET_ID){
 const dataset=getPropertyDataset(datasetId);const photo=dataset?.photos.find(item=>item.imageUrl===url);
 return !!dataset&&!!photo&&referenceUseEnabled(dataset)&&result.imageSha256?.toLowerCase()===photo.sourceSha256.toLowerCase()&&result.width===photo.sourceWidth&&result.height===photo.sourceHeight;
}
export function datasetContext(datasetId?:string):InspectionContext|undefined {
 if(datasetId===SYNTHETIC_DATASET_ID)return undefined;
 const dataset=getPropertyDataset(datasetId??DATASET_ID);if(!dataset)throw new Error('Unknown dataset');
 if(!referenceUseEnabled(dataset))throw new Error('Dataset reference use is not enabled');
 const references:Evidence[]=dataset.photos.map(photo=>({id:photo.id,roomId:photo.roomId,type:'photo',sourceName:photo.title,content:`Source room-context photograph only. ${photo.description} ${dataset.zoneNotes[photo.roomId]} It is not a current inspection photograph and does not establish any simulated incident.`,synthetic:false,scope:'reference-context',capturedAt:photo.capturedAt,sourceUrl:photo.sourceUrl,photoUrl:photo.localUrl,imageUrl:photo.imageUrl,rights:photo.rights,attribution:photo.credit,sourceDatasetId:dataset.id}));
 for(const roomId of ['bathroom','kitchen']as const){if(references.some(item=>item.roomId===roomId))continue;references.push({id:`REF-NO-${roomId}`,roomId,type:'note',sourceName:`No verified ${rooms[roomId].name.toLowerCase()} photograph`,content:dataset.zoneNotes[roomId],synthetic:false,scope:'reference-context',sourceUrl:dataset.sourceUrl,sourceDatasetId:dataset.id,photoUnavailable:true,rights:'No image supplied; coverage limitation from the selected dataset manifest.'});}
 return {datasetId:dataset.id,propertyName:dataset.name,evidence:[...structuredClone(evidence),...references],referencePhotosEnabled:true,provenance:`${dataset.provenance} Incident notes, meter readings and occupancy assumptions are separately labelled synthetic training inputs; no defect or energy issue is asserted at the actual reference property.`};
}
