import mongoose from 'mongoose';
import uniqueValidator from 'mongoose-unique-validator';
import autopopulatePlugin from 'mongoose-autopopulate';
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

export const autopopulate = function(opts) {
    return (this._fields && this._fields[opts.path]) || true;
};

mongoose.plugin(uniqueValidator, { message: 'general-unique-{PATH}-{MIN}-{MAX}-{MINLENGTH}-{MAXLENGTH}' });
mongoose.plugin(autopopulatePlugin);

export const connectDatabase = database => {

    const logger = createLogger("mongoose");    

    if (!process.env.DB_URL) {
        throw new Error('Missing env variable DB_URL');
    }

    const connection = mongoose.connect(`${process.env.DB_URL}${database ? `/${database}` : ""}`, { useNewUrlParser: true, bufferCommands: false });

    logger.level === "debug" && mongoose.set("debug", (collectionName, method, query, doc) => {
        logger.log("debug", "Executing on collection '%s' method '%s' query '%o' with fields '%o'", collectionName, method, query, doc);
    });

    return connection;

};
export const disconnectDatabase = () => mongoose.connection.close(true);