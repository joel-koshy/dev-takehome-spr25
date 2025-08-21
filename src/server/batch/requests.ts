import { getCollection } from "@/lib/db/mongodb";
import { BatchReturn } from "@/lib/types/batch/requests";
import {
    isValidBatchEditRequests,
    isValidDeleteRequests,
} from "@/lib/validation/batch/requests";

export async function BatchApproveRequests(
    request: any,
    dbName: string = "crisis_corner"
): Promise<BatchReturn> {
    const batchUpdateOperations = isValidBatchEditRequests(request);
    const col = await getCollection(dbName);
    const result = await col.bulkWrite(batchUpdateOperations);

    return {
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
        upserts: result.upsertedCount,
        errors: result.getWriteErrors?.() ?? [],
    };
}

export async function BatchDeleteRequests(
    request: any,
    dbName: string = "crisis_corner"
):Promise<BatchReturn> {
    const batchDeleteOperations = isValidDeleteRequests(request);
    const col = await getCollection(dbName);
    const result = await col.bulkWrite(batchDeleteOperations);

    return {
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
        upserts: result.upsertedCount,
        errors: result.getWriteErrors?.() ?? [],
    };
}
