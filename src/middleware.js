import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import bodyParser from 'body-parser';
import validate from "validate.js";
import { getPermissions } from "shared-tools";

export const commonMiddlewares = [
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
 * Resulted filter stored in "res.locals.permissions" parameter
 * @param {Object} schema
 */
export const security = (schema, logger) => (req, res, next) => {
    const { user } = res.locals;
    const permissions = getPermissions(
        user,
        schema,
        "create",
        "read",
        "update",
        "delete"
    );
    const { method } = req;
    if (( method === "POST" && !permissions.create ) ||
            ( method === "GET" && !permissions.read ) ||
            ( method === "PUT" && !permissions.update ) ||
            ( method === "DELETE" && !permissions.delete )) {
        res.status(403);
        res.json({ message: "Access is denied" });
        logger && logger.warn("Access denied for %s to %s", req.ip, req.originalUrl);
        return;
    }
    res.locals.permissions = permissions;
    next();
};

export const validator = (constraints, opts) => (req, res, next) => {
    const errors = validate(req.body, constraints, opts);
    if (errors) {
        res.status(400);
        return res.json({ message: "Validation failed", errors });
    }
    next();
};

export const unauthorized = logger => (req, res, next) => {
    if (res.locals.user) return next();
    logger && logger.warn("Unauthorized access from %s to %s", req.ip, req.originalUrl);
    res.status(401);
    res.json({ message: "Unathorized" });
};