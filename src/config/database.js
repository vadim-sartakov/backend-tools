import mongoose from 'mongoose';
import createLogger from './logger';

const logger = createLogger("mongoose");

export const connectDatabase = () => {

    if (!process.env.DB_URL) {
        throw new Error('Missing env variable DB_URL');
    }

    const connection = mongoose.connect(process.env.DB_URL, { useNewUrlParser: true, bufferCommands: false });

    process.env.LOG_LEVEL === "debug" && mongoose.set("debug", (collectionName, method, query, doc) => {
        logger.log("debug", "Executing on collection '%s' method '%s' query '%o' with fields '%o'", collectionName, method, query, doc);
    });

    return connection;

};
export const disconnectDatabase = () => mongoose.connection.close(true);