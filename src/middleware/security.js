import { getPermissions } from "shared-tools";

export const securityFilter = (securitySchema, ...accessModifiers) => (req, res, next) => {
    const { user } = res.locals;
    const result = getPermissions(user, securitySchema, ...accessModifiers);
    next();
};

/**
 * Checks current user sotred in "user.local" against security schema.
 * Resulted filter stored in "res.locals.readFilter" parameter
 * @param {Object} securitySchema
 */
export const readFilter = securitySchema => (req, res, next) => {
    next();
};

/**
 * Checks current user sotred in "user.local" against security schema.
 * Updates request body according schema then stores result in "res.locals.filteredBody"
 * @param {*} securitySchema 
 */
export const updateFilter = securitySchema => (req, res, next) => {
    next();
};

/**
 * Validates body against validation schema.
 * ValidationError is thrown in case if validation fails.
 * @param {*} validationSchema 
 */
export const validator = validationSchema => (req, res, next) => {
    next();
};