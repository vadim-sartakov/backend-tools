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

    const resetValuesHandler = (projection, getValue, restoreValue) => {
        const exclusive = projection[Object.keys(projection)[0]] === 0;
        return path => {
            if (path.includes("createdAt") || path.includes("updatedAt") || path.includes("_")) return;
            // Reducing path to first array
            path = path.split(".").reduce((prev, cur) => {
                const isArray = Array.isArray(getValue(prev));
                return isArray ? prev : `${prev}.${cur}`;
            });
            if ((exclusive && projection[path] === 0) || (!exclusive && !projection[path])) {
                restoreValue(path);
            }
        };
    };

    function onSave({ projection }) {
        if (!projection) return;
        eachPathRecursive(schema, resetValuesHandler(projection, path => _.get(this._doc, path), path => _.set(this._doc, path, undefined)));
    }

    function onRead({ where, projection }) {
        where && this.or(...where);
        projection && this.select(projection);
    }

    async function onUpdate({ where, projection }) {
        where && this.or(...where);
        if (!projection) return;
        const existing = await this.model.findOne(this._conditions).setOptions({ lean: true });
        eachPathRecursive(schema, resetValuesHandler(projection, path => _.get(this._update, path), path => {
            const prevValue = _.get(existing, path);
            prevValue && _.set(this._update, path, prevValue);
        }));
    }

    schema.pre("save", createSecurityHandler("create", onSave));
    schema.pre("find", createSecurityHandler("read", onRead));
    schema.pre("findOne", createSecurityHandler("read", onRead));
    schema.pre("findOneAndUpdate", createSecurityHandler("update", onUpdate));
    schema.pre("findOneAndRemove", createSecurityHandler("delete", onRead));

};

export default securityPlugin;