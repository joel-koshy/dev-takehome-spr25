import { WriteError } from "mongodb";

export interface BatchReturn{
    matchedCount: number, 
    modifiedCount: number, 
    upserts: number, 
    errors: WriteError[], 
}

