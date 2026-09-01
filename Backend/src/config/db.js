import mongoose from "mongoose";

const RETRY_MS = 5000
const MAX_RETRIES = 10

/**
 * Connects to Mongo with bounded retries and exponential backoff. Earlier the
 * client gave up permanently after one failure (and a dead-at-first-boot
 * replica-set URI produced a silent, retry-until-30s hang), which made the
 * process start with no DB. Now each attempt fails fast with serverSelectionTimeoutMS
 * and the whole boot waits/retries so transient network blips don't kill startup.
 */
const connectWithRetry = async (attempt = 1) => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            dbName: 'zeltxx',
            serverSelectionTimeoutMS: 10000
        })
        console.log("mongoose connected to database: zeltxx")
        return
    }
    catch (error) {
        console.log(`Mongo Not Connected (attempt ${attempt}/${MAX_RETRIES}):`, error?.message || error)
        if (attempt >= MAX_RETRIES) {
            console.error("Exhausted Mongo connection retries. Exiting.")
            process.exit(1)
        }
        const backoff = RETRY_MS * 2 ** Math.min(attempt - 1, 4)
        await new Promise((resolve) => setTimeout(resolve, backoff))
        return connectWithRetry(attempt + 1)
    }
}

const connectToMongo = () => {
    // Missing MONGO_URI isn't a transient failure — retrying just burns a
    // deploy cycle. Fail loud and fast in production; in dev, boot anyway
    // (the /health endpoint reports degraded) so the UI still loads.
    if (!process.env.MONGO_URI) {
        if (process.env.NODE_ENV === 'production') {
            console.error("MONGO_URI is not set. Add it in the Render dashboard (Environment tab), then redeploy.")
            process.exit(1)
        }
        console.warn("MONGO_URI is not set — skipping DB connection, API will run degraded.")
        return
    }
    return connectWithRetry();
};

export { connectToMongo };