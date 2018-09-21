import dotenv from 'dotenv';
import createDebug from 'debug';

const env = process.env.NODE_ENV;
dotenv.config({ path: `./${env === "test" ? ".test" : ""}.env` });
// Force debug parameter parsing as it was read from file.
createDebug.enable(process.env.DEBUG);