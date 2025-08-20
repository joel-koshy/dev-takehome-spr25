import { PAGINATION_PAGE_SIZE } from "@/lib/constants/config";
import clientPromise, { getCollection } from "@/lib/db/mongodb";
import { InvalidPaginationError, InvalidInputError } from "@/lib/errors/inputExceptions";
import { MockItemRequest } from "@/lib/types/mock/request";
import { RequestStatus } from "@/lib/types/request";
import { ItemRequest } from "@/lib/types/requests/requests";
import { isValidStatus, isValidString } from "@/lib/validation/request/requests";
import { Collection } from "mongodb";

export async function getItemRequests(
    status: string | null,
    page: number,
    dbName:string = "crisis_corner"
): Promise<MockItemRequest[]> {
    if(page < 1){
        throw new InvalidPaginationError(page, PAGINATION_PAGE_SIZE)
    }
    try {
        const col:Collection<ItemRequest> =  await getCollection(dbName)

        const aggregatedQuery: object[] = [];
        const validatedStatus = isValidStatus(status);

        // Filter status
        if (validatedStatus) {
            aggregatedQuery.push({
                $match: {
                    status: status,
                },
            });
        }

        // Sort By date
        aggregatedQuery.push({
            $sort: {
                requestCreatedDate: -1,
                requestorName: 1, 
            },
        });

        // Paginate

        aggregatedQuery.push({
            $skip: (Math.max(1, page) - 1) * PAGINATION_PAGE_SIZE,
        });
        aggregatedQuery.push({
            $limit: PAGINATION_PAGE_SIZE,
        });

        // Follow MockItemRequest Type (changes _id to id )
        aggregatedQuery.push({
            $project: {
                _id: 0,
                id: "$_id",
                requestorName: "$requestorName",
                itemRequested: "$itemRequested",
                requestCreatedDate: "$requestCreatedDate",
                lastEditedDate: "$lastEditedDate",
                status: "$status",
            },
        });

        let items = await col
            .aggregate<MockItemRequest>(aggregatedQuery)
            .toArray();
        return items;
    } catch (error) {
        console.error("Error fetching item request", error);
        throw new Error("Failed to retrieve item Requests");
    }
}

export async function createItemRequest(request: any, dbName:string = "crisis_corner"): Promise<ItemRequest>{
    //validation 
    if(!request){
        throw new InvalidInputError("Missing Request Body")
    }

    const {requestorName, itemRequested, status} = request 

    if(!isValidString(requestorName, 3, 30)){
        throw new InvalidInputError("Missing or invalid 'requestorName' field")
    }
    if(!isValidString(itemRequested, 2, 100)){
        throw new InvalidInputError("Missing or invalid 'itemRequested' field")
    }

    let newItemStatus:RequestStatus; 
    if(!status){
        newItemStatus = RequestStatus.PENDING
    }else if(isValidStatus(status)){
        newItemStatus = status
    }else{
        throw new InvalidInputError("Supplied Status is Invalid")
    }

    const date = new Date
    const newRequest: ItemRequest = {
        requestorName: requestorName,  
        itemRequested: itemRequested, 
        requestCreatedDate: date,
        lastEditedDate: date, 
        status : newItemStatus
    }
    try {
        const col: Collection<ItemRequest> = await getCollection(dbName)
        await col.insertOne(newRequest)
        return newRequest
    } catch (error) {
       console.error("Error Creating Item Request", error); 
       throw new Error("Failed to create item request");
    }
}

