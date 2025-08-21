import { WriteError } from "mongodb";
import { RequestStatus } from "../request";

export interface BatchReturn{
    matchedCount: number, 
    modifiedCount: number, 
    upserts: number, 
    errors: WriteError[], 
}



