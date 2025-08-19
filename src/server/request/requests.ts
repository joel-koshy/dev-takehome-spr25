import { PAGINATION_PAGE_SIZE } from "@/lib/constants/config";
import clientPromise from "@/lib/db/mongodb";
import { InvalidPaginationError } from "@/lib/errors/inputExceptions";
import { MockItemRequest } from "@/lib/types/mock/request";
import { isValidStatus } from "@/lib/validation/request/requests";
import { Collection } from "mongodb";

export async function getItemRequests(
    status: string | null,
    page: number,
    collectionName:string = "requests"
): Promise<MockItemRequest[]> {
    if(page < 1){
        throw new InvalidPaginationError(page, PAGINATION_PAGE_SIZE)
        console.log("reached")
    }
    try {
        const client = await clientPromise;
        const db = client.db("crisis_corner");
        const col: Collection<MockItemRequest> = db.collection(collectionName);

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
                id: "$id",
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

