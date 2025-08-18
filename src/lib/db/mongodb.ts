import { MongoClient } from "mongodb";

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
