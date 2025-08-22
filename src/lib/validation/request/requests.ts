import { InvalidInputError } from "@/lib/errors/inputExceptions";
import { RequestStatus } from "@/lib/types/request";
import {
    CreateItemRequest,
    EditItemRequest,
    GeoLocation,
} from "@/lib/types/requests/requests";
import { ObjectId } from "mongodb";

export function isValidString(
    str: any,
    lower?: number,
    upper?: number
): boolean {
    if (typeof str !== "string" || str.trim() == "") {
        return false;
    }
    if ((lower && str.length < lower) || (upper && str.length > upper)) {
        return false;
    }
    return true;
}

export function isValidStatus(status: any): boolean {
    return (
        isValidString(status) &&
        Object.values(RequestStatus).includes(status as RequestStatus)
    );
}

export function isValidCreateItemRequest(request: any): CreateItemRequest {
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

    return {
        requestorName,
        itemRequested,
        status: newItemStatus,
        location: newLocation,
    };
}

export function isValidEditItemRequest(request: any): EditItemRequest {
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
    return {
        id: new ObjectId(id),
        status: status,
    };
}
