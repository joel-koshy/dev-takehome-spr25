import { PAGINATION_PAGE_SIZE } from "@/lib/constants/config";
import clientPromise, { getCollection } from "@/lib/db/mongodb";
import {
    InvalidPaginationError,
    InvalidInputError,
} from "@/lib/errors/inputExceptions";
import { RequestStatus } from "@/lib/types/request";
import { GeoLocation, ItemRequest } from "@/lib/types/requests/requests";
import {
    isValidCreateItemRequest,
    isValidEditItemRequest,
    isValidStatus,
    isValidString,
} from "@/lib/validation/request/requests";
import { Collection, ObjectId } from "mongodb";

export async function getItemRequests(
    status: string | null,
    page: number,
    dbName: string = "crisis_corner"
): Promise<ItemRequest[]> {
    if (page < 1) {
        throw new InvalidPaginationError(page, PAGINATION_PAGE_SIZE);
    }
    try {
        const col: Collection<ItemRequest> = await getCollection(dbName);

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

        // Follow ItemRequest Type (changes _id to id )
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

        let items = await col.aggregate<ItemRequest>(aggregatedQuery).toArray();
        return items;
    } catch (error) {
        console.error("Error fetching item request", error);
        throw new Error("Failed to retrieve item Requests");
    }
}

export async function createItemRequest(
    request: any,
    dbName: string = "crisis_corner"
): Promise<ItemRequest> {
    if (!request) {
        throw new InvalidInputError("Missing Request Body");
    }

    const { requestorName, itemRequested, status, location } =
        isValidCreateItemRequest(request);

    const date = new Date();
    const newRequest: ItemRequest = {
        requestorName: requestorName,
        itemRequested: itemRequested,
        requestCreatedDate: date,
        lastEditedDate: date,
        status: status ?? RequestStatus.PENDING,
        ...(location && { location: location }),
    };
    try {
        const col: Collection<ItemRequest> = await getCollection(dbName);
        await col.insertOne(newRequest);
        return newRequest;
    } catch (error) {
        console.error("Error Creating Item Request", error);
        throw new Error("Failed to create item request");
    }
}

export async function editItemRequest(
    request: any,
    dbName: string = "crisis_corner"
): Promise<ItemRequest | null> {
    const { id, status } = isValidEditItemRequest(request);
    try {
        const col: Collection<ItemRequest> = await getCollection(dbName);
        const result = await col.findOneAndUpdate(
            { _id: id },
            {
                $set: {
                    status: status,
                    lastEditedDate: new Date(),
                },
            },
            { returnDocument: "after" }
        );
        if (result) {
            return result;
        }
        return null;
    } catch (error) {
        console.log("Error updating item request:", error);
        throw new Error("Failed to update item request");
    }
}
