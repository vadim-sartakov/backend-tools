import mongoose from "mongoose";
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

    const getUser = options => {
        const { user } = options;
        return user;
    };

    const createQuerySecurityHandler = (action, callback) => function querySecurityHandler() {
        const user = getUser(this.options);
        const permissions = getPermissions(security, user, action);
        if (!permissions) throw new AccessDeniedError();
        callback.call(this, permissions);
    };

    function documentSecurityHandler() {
        let user;
        try {
            user = getUser(this._options || {});
        } catch (err) {
            // Error throwing does not stop execution chain for some reason.
            // Promise rejection works.
            return Promise.reject(err);
        }
        const permissions = getPermissions(security, user, "create");
        if (!permissions) return Promise.reject(new AccessDeniedError());
        onSave.call(this, permissions);
    }

    const eachFieldRecursive = (object, path, callback) => {
        Object.keys(object).forEach(curPath => {
            const fullPath = `${path}${path === "" ? "" : "."}${curPath}`;
            const property = object[curPath];
            if (property && typeof property === "object" && !property._bsontype) {
                eachFieldRecursive(property, fullPath, callback);
            }
            callback(object, fullPath, curPath);
        });
    };

    function onSave({ projection }) {
        if (!projection) return;
        const exclusive = projection[Object.keys(projection)[0]] === 0;
        eachFieldRecursive(this._doc, "", (property, fullPath, curPath) => {
            if (exclusive && projection[fullPath] === 0) {
                delete property[curPath];
            } else if (!exclusive && !projection[fullPath]) {
                delete property[curPath];
            }
        });
    }

    function onRead({ where, projection }) {
        where && this.or(...where);
        projection && this.select(projection);
    }

    function onUpdate({ where, projection }) {
        where && this.or(...where);
    }

    schema.pre("save", documentSecurityHandler);
    schema.pre("find", createQuerySecurityHandler("read", onRead));
    schema.pre("findOne", createQuerySecurityHandler("read", onRead));
    schema.pre("findOneAndUpdate", createQuerySecurityHandler("update", onUpdate));
    schema.pre("findOneAndRemove", createQuerySecurityHandler("delete", onRead));

};

export default securityPlugin;