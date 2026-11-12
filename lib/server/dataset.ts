import {propertyDataset,DATASET_ID} from '../property-dataset';
import {evidence,Evidence,rooms} from '../scenario';
import type {InspectionContext} from './store';
export const SYNTHETIC_DATASET_ID='synthetic-apartment';
export function isVerifiedImageUrl(url:string){return propertyDataset.rightsVerified&&propertyDataset.photos.some(photo=>photo.imageUrl===url);}
export function verifySourceImage(url:string, result:{imageSha256:string|null;width:number|null;height:number|null}){
 const photo=propertyDataset.photos.find(item=>item.imageUrl===url);
 return !!photo&&propertyDataset.rightsVerified&&result.imageSha256?.toLowerCase()===photo.sourceSha256.toLowerCase()&&result.width===photo.sourceWidth&&result.height===photo.sourceHeight;
}
export function datasetContext(datasetId?:string):InspectionContext|undefined {
 if(datasetId===SYNTHETIC_DATASET_ID)return undefined;
 if(datasetId&&datasetId!==DATASET_ID)throw new Error('Unknown dataset');
 if(!propertyDataset.rightsVerified){if(datasetId)throw new Error('Dataset rights are not verified');return undefined;}
 const references:Evidence[]=propertyDataset.photos.map(photo=>({id:photo.id,roomId:photo.roomId,type:'photo',sourceName:photo.title,content:`Archival room-context photograph only. ${photo.description} ${propertyDataset.zoneNotes[photo.roomId]} It is not a current inspection photograph and does not establish any simulated incident.`,synthetic:false,scope:'reference-context',capturedAt:photo.capturedAt,sourceUrl:photo.sourceUrl,photoUrl:photo.localUrl,imageUrl:photo.imageUrl,rights:photo.rights,attribution:photo.credit,sourceDatasetId:DATASET_ID}));
 for(const roomId of ['bathroom','kitchen']as const){if(references.some(item=>item.roomId===roomId))continue;references.push({id:`REF-NO-${roomId}`,roomId,type:'note',sourceName:`No verified ${rooms[roomId].name.toLowerCase()} photograph`,content:propertyDataset.zoneNotes[roomId],synthetic:false,scope:'reference-context',sourceUrl:propertyDataset.sourceUrl,sourceDatasetId:DATASET_ID,photoUnavailable:true,rights:'No image supplied; coverage limitation from the verified dataset manifest.'});}
 return {datasetId:DATASET_ID,propertyName:propertyDataset.name,evidence:[...structuredClone(evidence),...references],referencePhotosEnabled:true,provenance:`${propertyDataset.provenance} Incident notes, meter readings and occupancy assumptions are separately labelled synthetic training inputs; no defect or energy issue is asserted at the actual historic property.`};
}
