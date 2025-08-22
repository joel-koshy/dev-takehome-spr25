import { ServerResponseBuilder } from "@/lib/builders/serverResponseBuilder";
import { ResponseType } from "@/lib/types/apiResponse";
import { getHeatMap } from "@/server/map/requests";

export async function GET(){
    try {
        const result = await getHeatMap()
        return new Response(JSON.stringify(result), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        })

    } catch (error) {
        console.error(error)
        return new ServerResponseBuilder(ResponseType.UNKNOWN_ERROR).build();
    }
}