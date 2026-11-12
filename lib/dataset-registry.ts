import {propertyDataset as farnsworthDataset,DATASET_ID as FARNSWORTH_ID} from './property-dataset';
import {websterDataset,WEBSTER_ID} from './webster-dataset';
export {WEBSTER_ID};
export const FARNSWORTH_DATASET_ID=FARNSWORTH_ID;
/** Active reference example chosen by the user; original image rights remain disclosed. */
export const DATASET_ID=WEBSTER_ID;
export const propertyDataset=websterDataset;
export const propertyDatasets=[websterDataset,farnsworthDataset] as const;
export type PropertyDataset=typeof propertyDatasets[number];
export function getPropertyDataset(id:string=DATASET_ID){return propertyDatasets.find(dataset=>dataset.id===id);}
export function referenceUseEnabled(dataset:PropertyDataset){return dataset.rightsVerified||'referenceUseAuthorized' in dataset&&dataset.referenceUseAuthorized===true;}
