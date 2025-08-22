import { ServerResponseBuilder } from "@/lib/builders/serverResponseBuilder";
import { InputException } from "@/lib/errors/inputExceptions";
import { ResponseType } from "@/lib/types/apiResponse";
import {
    BatchApproveRequests,
    BatchDeleteRequests,
} from "@/server/batch/requests";
import { NextResponse } from "next/server";

export async function PATCH(req: Request) {
    try {
        const body = await req.json();
        const result = await BatchApproveRequests(body);
        return new Response(JSON.stringify(result), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    } catch (e: any) {
        console.error(e)
        if (e instanceof InputException) {
            return new ServerResponseBuilder(
                ResponseType.INVALID_INPUT
            ).build();
        }
        return new ServerResponseBuilder(ResponseType.UNKNOWN_ERROR).build();
    }
}

export async function DELETE(req: Request) {
    try {
        const body = await req.json();
        const result = await BatchDeleteRequests(body);
        return NextResponse.json(result, { status: 200 });
    } catch (e: any) {
        console.error(e)
        if (e instanceof InputException) {
            return new ServerResponseBuilder(
                ResponseType.INVALID_INPUT
            ).build();
        }
        return new ServerResponseBuilder(ResponseType.UNKNOWN_ERROR).build();
    }
}
