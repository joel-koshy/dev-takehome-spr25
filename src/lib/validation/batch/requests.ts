import { InvalidInputError } from "@/lib/errors/inputExceptions";
import { RequestStatus } from "@/lib/types/request";
import {
    AnyBulkWriteOperation,
    BulkWriteOperationError,
    ObjectId,
    UpdateOneModel,
} from "mongodb";

export function isValidBatchEditRequests(
    request: any
): AnyBulkWriteOperation<any>[] {
    if (!Array.isArray(request) || request.length === 0) {
        throw new InvalidInputError("Edits must be a non-empty array");
    }
    const operations: AnyBulkWriteOperation<any>[] = request.map((edit) => {
        if (!edit.id || typeof edit.id !== "string") {
            throw new InvalidInputError(
                `Each edit request must have a vlaid string ID`
            );
        }
        const idStr = String(edit.id);
        if (!ObjectId.isValid(idStr)) {
            throw new InvalidInputError(`Invalid ObjectId: ${edit.id}`);
        }
        const id = new ObjectId(idStr);

        if (!Object.values(RequestStatus).includes(edit.status)) {
            throw new InvalidInputError(`Invalid status: ${edit.status}`);
        }

        return {
            updateOne: {
                filter: { _id: id },
                update: {
                    $set: {
                        status: edit.status,
                        lastEditedDate: new Date(),
                    },
                },
            },
        };
    });

    return operations;
}

export function isValidDeleteRequests(
    request: any
): AnyBulkWriteOperation<any>[] {
    if (!Array.isArray(request) || request.length === 0) {
        throw new InvalidInputError("Delete IDs must be a non-empty array");
    }

    const operation: AnyBulkWriteOperation<any>[] = request.map((item) => {
        if (!item.id || typeof item.id !== "string") {
            throw new InvalidInputError(
                `Each delete request must have a valid string ID`
            );
        }
        const idStr = String(item.id);
        if (!ObjectId.isValid(idStr)) {
            throw new InvalidInputError(`Invalid ObjectId: ${item.id}`);
        }
        const id = new ObjectId(idStr);

        return {
            deleteOne: { filter: { _id: id } },
        };
    });

    return operation;
}
