import { ServerResponseBuilder } from "@/lib/builders/serverResponseBuilder";
import { InputException } from "@/lib/errors/inputExceptions";
import { ResponseType } from "@/lib/types/apiResponse";
import { createItemRequest, editItemRequest, getItemRequests } from "@/server/request/requests";

export async function GET(request: Request) {
    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const page = parseInt(url.searchParams.get("page") || "1");
    try {
        const results =await getItemRequests(status, page);
        console.log(results)
        return new Response(JSON.stringify(results), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    } catch (e) {
        if (e instanceof InputException) {
            return new ServerResponseBuilder(
                ResponseType.INVALID_INPUT
            ).build();
        }
        return new ServerResponseBuilder(ResponseType.UNKNOWN_ERROR).build();
    }
}


export async function PUT(request: Request) {
    console.log("hello")
  try {
    const req = await request.json();
    const newRequest = await createItemRequest(req);
    return new Response(JSON.stringify(newRequest), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    if (e instanceof InputException) {
      return new ServerResponseBuilder(ResponseType.INVALID_INPUT).build();
    }
    return new ServerResponseBuilder(ResponseType.UNKNOWN_ERROR).build();
  }
}


export async function PATCH(request: Request) {
    console.log("hello")
  try {
    const req = await request.json();
    const editedRequest = await editItemRequest(req);
    return new Response(JSON.stringify(editedRequest), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    if (e instanceof InputException) {
        console.log(e)
      return new ServerResponseBuilder(ResponseType.INVALID_INPUT).build();
    }
    return new ServerResponseBuilder(ResponseType.UNKNOWN_ERROR).build();
  }
}



