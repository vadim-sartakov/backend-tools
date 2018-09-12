import dotenv from 'dotenv';
import createDebug from 'debug';

const initialize = () => {
    const env = process.env.NODE_ENV;
    dotenv.config({ path: `./.env${env === "test" ? ".test" : ""}` });
    // Force debug parameter parsing as it was read from file.
    createDebug.enable(process.env.DEBUG);
};

export default initialize;
