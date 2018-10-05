import mongoose from 'mongoose';
import uniqueValidator from 'mongoose-unique-validator';
import autopopulate from '../plugin/autopopulate';
import i18n from '../plugin/i18n';
import createLogger from './logger';

mongoose.plugin(i18n);
mongoose.plugin(uniqueValidator);
mongoose.plugin(autopopulate);

export const connectDatabase = database => {

    const logger = createLogger("mongoose");    

    if (!process.env.DB_URL) {
        throw new Error('Missing env variable DB_URL');
    }

    const connection = mongoose.connect(`${process.env.DB_URL}${database ? `/${database}` : ""}`, { useNewUrlParser: true, bufferCommands: false });

    logger.level === "debug" && mongoose.set("debug", (collection, method, query, doc, options) => {
        logger.log("debug", "Executing on collection '%s' method '%s' query '%o' with fields '%o'", collection, method, query, doc);
    });

    return connection;

};
export const disconnectDatabase = () => mongoose.connection.close(true);