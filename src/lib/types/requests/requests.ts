import { ObjectId } from "mongodb";
import { RequestStatus } from "../request";

export interface ItemRequest {
    id?: ObjectId;
    requestorName: string;
    itemRequested: string;
    requestCreatedDate: Date;
    lastEditedDate: Date | null;
    status: RequestStatus;
}

export interface CreateItemRequest {
    requestorName: string;
    itemRequested: string;
    status?: RequestStatus;
}
