import mongoose from 'mongoose';
import uniqueValidator from 'mongoose-unique-validator';
import createLogger from './logger';

mongoose.plugin(uniqueValidator, { message: '{PATH}.validation.unique' });

export const connectDatabase = () => {

    const logger = createLogger("mongoose");    

    if (!process.env.DB_URL) {
        throw new Error('Missing env variable DB_URL');
    }

    const connection = mongoose.connect(process.env.DB_URL, { useNewUrlParser: true, bufferCommands: false });

    logger.level === "debug" && mongoose.set("debug", (collectionName, method, query, doc) => {
        logger.log("debug", "Executing on collection '%s' method '%s' query '%o' with fields '%o'", collectionName, method, query, doc);
    });

    return connection;

};
export const disconnectDatabase = () => mongoose.connection.close(true);