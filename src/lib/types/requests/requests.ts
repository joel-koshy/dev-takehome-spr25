import { ObjectId } from "mongodb";
import { RequestStatus } from "../request";


export type GeoLocation = {
    type: "Point", 
    coordinates:[number, number];
}

export interface ItemRequest {
    _id?: any;
    id?: ObjectId;
    requestorName: string;
    itemRequested: string;
    requestCreatedDate: Date;
    lastEditedDate: Date | null;
    status: RequestStatus;

    location?: GeoLocation
}

export interface CreateItemRequest {
    requestorName: string;
    itemRequested: string;
    status?: RequestStatus;
}
