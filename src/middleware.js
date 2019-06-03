import helmet from "helmet";
import cookieParser from "cookie-parser";
import bodyParser from "body-parser";
import createDebug from "debug";
import { asyncMiddleware } from "./utils";
import { validate, getPermissions } from "common-tools";

export const commonMiddlewares = [
  helmet(),
  cookieParser(),
  bodyParser.urlencoded({ extended: true }),
  bodyParser.json()
];

export const notFound = () => {
  const debug = createDebug("middleware:notFound");
  return (req, res) => {
    debug("%s requested non-existed resource %s", req.ip, req.originalUrl);
    res.status(404).send({ message: "Not found" });
  };
};

export const internalError = () => {
  const debug = createDebug("middleware:internalError");
  return (err, req, res, next) => { // eslint-disable-line no-unused-vars
    debug("%s\n%s", err.message, err.stack);
    res.status(500).send({ message: "Internal server error" });
  };
};

/**
 * Checks current user stored in "user.local" against security schema.
 * Resulted filter stored in "res.locals.permissions" parameter
 * @param {Object} schema
 */
export const security = (schema, ...modifiers) => {
  const debug = createDebug("middleware:security");
  return (req, res, next) => {
    const { user } = res.locals;
    const permissions = getPermissions(
      user,
      schema,
      ...modifiers
    );
    const denied = modifiers.some(modifier => !permissions[modifier]);
    if (denied) {
      res.status(403);
      res.json({ message: "Access is denied" });
      debug("Access denied for %s to %s", req.ip, req.originalUrl);
      return;
    }
    res.locals.permissions = permissions;
    next();
  };
};

export const validator = constraints => {
  const debug = createDebug("middleware:validator");
  return asyncMiddleware(async (req, res, next) => {
    const errors = await validate(req.body, constraints);
    if (errors) {
      debug("Validation failed. Url: %s; payload: %o; errors: %o", req.originalUrl, req.body, errors);
      res.status(400);
      return res.json({ message: "Validation failed", errors });
    }
    next();
  })
};

export const unauthorized = () => {
  const debug = createDebug("middleware:unauthorized");
  return (req, res, next) => {
    if (res.locals.user) return next();
    debug("Unauthorized access from %s to %s", req.ip, req.originalUrl);
    res.status(401);
    res.json({ message: "Unathorized" });
  };
};