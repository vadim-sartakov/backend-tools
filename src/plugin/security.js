import _ from "lodash";
import { eachPathRecursive } from "./utils";
import AccessDeniedError from "../error/accessDenied";

const ADMIN = "ADMIN";
const ADMIN_READ = "ADMIN_READ";

export const getPermissions = (security, user, action) => {

    if (!user) return true;

    const projectionToObject = projection => {
        if (typeof projection === "object") return projection;
        return projection.split(" ").reduce((prev, field) => {
            const excluding = field.startsWith("-");
            if (excluding) field = field.replace("-", "");
            return { ...prev, [field]: excluding ? 0 : 1 };
        }, {});
    };

    return user.roles.reduce((prevPermission, role) => {

        if (prevPermission === true ||
                role === ADMIN ||
                (action === "read" && role === ADMIN_READ)) {
            return true;
        }

        if (!security) return false;

        const rolePermissions = security[role] || {};
        let permission = rolePermissions[action];
        if (permission === true) {
            return true;
        }
        
        if (!permission) {
            return false;
        }

        if (typeof rolePermissions !== "object") {
            return false;
        }

        let where;
        if (permission.where) {
            where = prevPermission.where || [];
            where.push(permission.where(user));
        }
        const prevProj = (prevPermission.projection && projectionToObject(prevPermission.projection)) || {};
        const curProj = (permission.projection && projectionToObject(permission.projection)) || {};

        return { where, projection: { ...prevProj, ...curProj } };

    }, false);

};

const securityPlugin = schema => {

    schema.methods.setOptions = function(options) {
        this._options = options;
        return this;
    };

    const { security } = schema.options;

    const createSecurityHandler = (action, callback) => async function querySecurityHandler() {
        const { user } = 
                (this.constructor.name === "Query" && this.options) ||
                (this.constructor.name === "model" && this._options) || {};
        const permissions = getPermissions(security, user, action);
        // Throwing error does not stop execution chain while saving.
        // Promise rejecting works in all cases.
        if (!permissions) return Promise.reject(new AccessDeniedError());
        await callback.call(this, permissions);
    };

    const normalizeSet = object => {
        const result = {};
        eachPathRecursive(schema, path => {
            // Reducing path to first array
            path = path.split(".").reduce((prev, cur) => {
                const isArray = Array.isArray(_.get(object, prev));
                return isArray ? prev : `${prev}.${cur}`;
            });
            const value = _.get(object, path);
            if (value) result[path] = value;
        });
        return result;
    };

    const handleRestricted = (object, projection, handler) => {
        const exclusive = projection[Object.keys(projection)[0]] === 0;
        const excludeFilter = path => (exclusive && projection[path] === 0) || (!exclusive && !projection[path]);
        Object.keys(object).filter(excludeFilter).forEach(path => handler(path));
    };

    function onSave({ projection }) {
        if (!projection) return;
        const normalizedDoc = normalizeSet(this._doc);
        handleRestricted(normalizedDoc, projection, path => this.set(path, undefined));
    }

    function onRead({ where, projection }) {
        where && this.or(...where);
        projection && this.select(projection);
    }

    async function onUpdate({ where, projection }) {
        where && this.or(...where);
        if (!projection) return;
        this._update = normalizeSet(this._update);
        handleRestricted(this._update, projection, path => delete this._update[path]);
    }

    schema.pre("save", createSecurityHandler("create", onSave));
    schema.pre("find", createSecurityHandler("read", onRead));
    schema.pre("findOne", createSecurityHandler("read", onRead));
    schema.pre("findOneAndUpdate", createSecurityHandler("update", onUpdate));
    schema.pre("findOneAndRemove", createSecurityHandler("delete", onRead));

};

export default securityPlugin;