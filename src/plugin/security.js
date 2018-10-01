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

    const createSecurityHandler = (action, callback) => function querySecurityHandler() {
        const { user } = (this.constructor.name === "Query" && this.options) || (this.constructor.name === "model" && this._options) || {};
        const permissions = getPermissions(security, user, action);
        // Throwing error does not stop execution chain while saving.
        // Promise rejecting works in all cases.
        if (!permissions) return Promise.reject(new AccessDeniedError());
        callback.call(this, permissions);
    };

    const eachFieldRecursive = (object, path, callback) => {
        Object.keys(object).forEach(curPath => {
            const fullPath = `${path}${path === "" ? "" : "."}${curPath}`;
            const property = object[curPath];
            if (!property || curPath.startsWith("_")) return;
            if (Array.isArray(property)) {
                property.forEach(item => eachFieldRecursive((item._doc && item._doc) || item, fullPath, callback));
            } else if (typeof property === "object") {
                eachFieldRecursive((property._doc && property._doc) || property, fullPath, callback);
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

    schema.pre("save", createSecurityHandler("create", onSave));
    schema.pre("find", createSecurityHandler("read", onRead));
    schema.pre("findOne", createSecurityHandler("read", onRead));
    schema.pre("findOneAndUpdate", createSecurityHandler("update", onUpdate));
    schema.pre("findOneAndRemove", createSecurityHandler("delete", onRead));

};

export default securityPlugin;