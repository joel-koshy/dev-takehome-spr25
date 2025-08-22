import { PAGINATION_PAGE_SIZE } from "@/lib/constants/config";
import clientPromise, { getCollection } from "@/lib/db/mongodb";
import {
    InvalidPaginationError,
    InvalidInputError,
} from "@/lib/errors/inputExceptions";
import { MockItemRequest } from "@/lib/types/mock/request";
import { RequestStatus } from "@/lib/types/request";
import { GeoLocation, ItemRequest } from "@/lib/types/requests/requests";
import {
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
    //validation
    if (!request) {
        throw new InvalidInputError("Missing Request Body");
    }

    const { requestorName, itemRequested, status, location } = request;

    if (!isValidString(requestorName, 3, 30)) {
        throw new InvalidInputError("Missing or invalid 'requestorName' field");
    }
    if (!isValidString(itemRequested, 2, 100)) {
        throw new InvalidInputError("Missing or invalid 'itemRequested' field");
    }

    let newItemStatus: RequestStatus;
    if (!status) {
        newItemStatus = RequestStatus.PENDING;
    } else if (isValidStatus(status)) {
        newItemStatus = status;
    } else {
        throw new InvalidInputError("Supplied Status is Invalid");
    }

    let newLocation: GeoLocation | undefined = undefined;
    if (location) {
        if (
            location.type !== "Point" ||
            !Array.isArray(location.coordinates) ||
            location.coordinates.length !== 2 ||
            typeof location.coordinates[0] !== "number" ||
            typeof location.coordinates[1] !== "number"
        ) {
            throw new InvalidInputError(
                "Invalid 'location' field. Must be GeoJSON Point [lng, lat]"
            );
        }
        newLocation = {
            type: "Point",
            coordinates: [location.coordinates[0], location.coordinates[1]],
        };
    }


    const date = new Date();
    const newRequest: ItemRequest = {
        requestorName: requestorName,
        itemRequested: itemRequested,
        requestCreatedDate: date,
        lastEditedDate: date,
        status: newItemStatus,
        ...(newLocation && { location: newLocation }),
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
    console.log("reached");
    if (!request || typeof request !== "object") {
        throw new InvalidInputError("Request body must be an object");
    }

    const { id, status } = request;

    if (!id || typeof id !== "string" || !ObjectId.isValid(id)) {
        throw new InvalidInputError("Invalid or missing ObjectId");
    }

    if (!status || !isValidStatus(status)) {
        console.log();
        throw new InvalidInputError("Invalid or missing status value");
    }

    try {
        const col: Collection<ItemRequest> = await getCollection(dbName);
        const result = await col.findOneAndUpdate(
            { _id: new ObjectId(id) },
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
