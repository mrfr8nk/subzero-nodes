import { MongoClient, Db } from 'mongodb';

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a MongoDB database?",
  );
}

let client: MongoClient;
let db: Db;

export async function connectToMongoDB() {
  if (!client) {
    client = new MongoClient(process.env.DATABASE_URL!);
    await client.connect();
    db = client.db();
    console.log('Connected to MongoDB');
  }
  return db;
}

export function getDb(): Db {
  if (!db) {
    throw new Error('Database not connected. Call connectToMongoDB() first.');
  }
  return db;
}

export { client, db };