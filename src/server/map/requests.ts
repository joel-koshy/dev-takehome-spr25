import { getCollection } from "@/lib/db/mongodb";

export async function getHeatMap(dbName = "crisis_corner") {
    const col = await getCollection(dbName);
    try {
        const itemsWithLocation = await col
            .find(
                { location: { $exists: true } },
                { projection: { location: 1 } }
            )
            .toArray();

        const heatMapData = itemsWithLocation.map((doc) => ({
            lat: doc.location?.coordinates[1],
            lng: doc.location?.coordinates[0],
        }));

        return heatMapData;
    } catch (error) {
        console.error(error) 
        throw new Error("Database Error")
    }
}


