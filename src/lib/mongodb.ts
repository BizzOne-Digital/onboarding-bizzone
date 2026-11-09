import { MongoClient, type Db } from "mongodb";

declare global {
  // eslint-disable-next-line no-var
  var _bzMongo: Promise<MongoClient> | undefined;
}

function client(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");
  if (!global._bzMongo) global._bzMongo = new MongoClient(uri).connect();
  return global._bzMongo;
}

export async function db(): Promise<Db> {
  // MONGODB_DB if set, otherwise the database named in the URI path. Never falls back to the old "bizzone" DB.
  const name = process.env.MONGODB_DB || undefined;
  const d = (await client()).db(name);
  if (d.databaseName === "test") throw new Error("No database name: set MONGODB_DB or add /<db-name> to MONGODB_URI");
  return d;
}
export const submissions = async () => (await db()).collection("submissions");
export const formLogs = async () => (await db()).collection("form_logs");
