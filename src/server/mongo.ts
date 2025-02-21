import { PrismaClient } from "@prisma/mongodb-client";
import { env } from "~/env";

const createMongoClient = () =>
  new PrismaClient({
    log:
      env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

const globalForMongo = globalThis as unknown as {
  mongoDb: ReturnType<typeof createMongoClient> | undefined;
};

export const mongo = globalForMongo.mongoDb ?? createMongoClient();

if (env.NODE_ENV !== "production") globalForMongo.mongoDb = mongo;
