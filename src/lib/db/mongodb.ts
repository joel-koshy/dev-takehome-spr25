import { ItemRequest } from "../types/requests/requests";
import { MongoClient, Collection } from "mongodb";

const uri = process.env.DB_URI;
const options = {};

if (!uri) {
  throw new Error("Please add your Mongo URI to environment variables");
}

const client = new MongoClient(uri, options);

declare global {
      // eslint-disable-next-line no-var
  var _mongoClientCache: Promise<MongoClient> | undefined;
}

const clientPromise: Promise<MongoClient> = global._mongoClientCache ?? client.connect();
global._mongoClientCache = clientPromise;

export default clientPromise;


export async function getCollection(
  dbName: string
): Promise<Collection<ItemRequest>> {
  const client = await clientPromise;
  return client.db(dbName).collection<ItemRequest>("requests");
}