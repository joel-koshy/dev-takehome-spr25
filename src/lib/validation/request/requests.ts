import { RequestStatus } from "@/lib/types/request";

function isValidString(str: any, lower?: number, upper?: number) :boolean{
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

