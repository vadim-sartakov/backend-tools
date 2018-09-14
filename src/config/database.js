import mongoose from 'mongoose';
import uniqueValidator from 'mongoose-unique-validator';
import createLogger from './logger';


/*general:
   { default: 'Validator failed for path `{PATH}` with value `{VALUE}`',
     required: 'Path `{PATH}` is required.' },
  Number:
   { min: 'Path `{PATH}` ({VALUE}) is less than minimum allowed value ({MIN}).',
     max: 'Path `{PATH}` ({VALUE}) is more than maximum allowed value ({MAX}).' },
  Date:
   { min: 'Path `{PATH}` ({VALUE}) is before minimum allowed value ({MIN}).',
     max: 'Path `{PATH}` ({VALUE}) is after maximum allowed value ({MAX}).' },
  String:
   { enum: '`{VALUE}` is not a valid enum value for path `{PATH}`.',
     match: 'Path `{PATH}` is invalid ({VALUE}).',
     minlength: 'Path `{PATH}` (`{VALUE}`) is shorter than the minimum allowed length ({MINLENGTH}).',
     maxlength: 'Path `{PATH}` (`{VALUE}`) is longer than the maximum allowed length ({MAXLENGTH}).' } }*/

mongoose.Error.messages.general.required = "{PATH}-required";

mongoose.Error.messages.String.match = "{PATH}-match";

mongoose.plugin(uniqueValidator, { message: '{PATH}-unique' });

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