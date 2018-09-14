import mongoose from 'mongoose';
import uniqueValidator from 'mongoose-unique-validator';
import createLogger from './logger';

const transformDefaultMessages = () => {
    const { messages } = mongoose.Error;
    Object.keys(messages).forEach(group => {
        messages[group] && Object.keys(messages[group]).forEach(message => {
            messages[group][message] = `${group}-${message}-{PATH}-{MIN}-{MAX}-{MINLENGTH}-{MAXLENGTH}`;
        });
    });
};

transformDefaultMessages();

mongoose.plugin(uniqueValidator, { message: 'general-unique-{PATH}-{MIN}-{MAX}-{MINLENGTH}-{MAXLENGTH}' });

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