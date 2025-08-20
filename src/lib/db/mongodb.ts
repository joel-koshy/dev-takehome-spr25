import { Collection, MongoClient } from "mongodb";
import { MockItemRequest } from "../types/mock/request";
import { ItemRequest } from "../types/requests/requests";

const URI = process.env.DB_URI
const options = {};

if (!URI) throw new Error("Please add your Mongo URI to environment variables");

let client = new MongoClient(URI, options);
let clientPromise:Promise<MongoClient>;

declare global {
    var _mongoClientCache: Promise<MongoClient> | undefined;
}

if (!global._mongoClientCache) {
    global._mongoClientCache = client.connect();
}
clientPromise = global._mongoClientCache;

export default clientPromise;

export async function getCollection<T>(
    dbName:string
): Promise<Collection<ItemRequest>> {
  const client = await clientPromise;
  return client.db(dbName).collection<ItemRequest>("requests");
}