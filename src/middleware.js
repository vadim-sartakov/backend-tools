import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import bodyParser from 'body-parser';
import { getPermissions } from "shared-tools";

export const common = [
    helmet(),
    cookieParser(),
    bodyParser.urlencoded({ extended: true }),
    bodyParser.json()
];

export const notFound = logger => (req, res) => {
    logger && logger.warn("%s requested non-existed resource %s", req.ip, req.originalUrl);
    res.status(404).send({ message: "Not found" });
};

export const internalError = logger => (err, req, res, next) => { // eslint-disable-line no-unused-vars
    logger && logger.error("%s\n%s", err.message, err.stack);
    res.status(500).send({ message: "Internal server error" });
};

/**
 * Checks current user sotred in "user.local" against security schema.
 * Resulted filter stored in "res.locals.security" parameter
 * @param {Object} securitySchema
 */
export const securityFilter = (securitySchema) => (req, res, next) => {
    const { user } = res.locals;
    const security = getPermissions(
        user,
        securitySchema,
        "read",
        "modify",
        "readFilter",
        "modifyFilter",
        "readFields",
        "modifyFields"
    );
    res.locals.security = security;
    next();
};