import lodash from "lodash";
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

    function onSave({ projection }) {
        if (!projection) return;
        const exclusive = projection[Object.keys(projection)[0]] === 0;

        Object.keys(projection).forEach(path => {
            /*path.split(".").forEach((value, index, array) => {
                const curPath = array.slice(0, index + 1).join(".");
                const property = lodash
            });*/
            const docPath = path.split(".").map((value, index, array) => {
                const property = array.slice(0, index + 1);
                return property._doc ? `${value}.${property._doc}` : value;
            }).join(".");
            if ((exclusive && projection[path] === 0) || (!exclusive && !projection[path])) {
                lodash.set(this._doc, docPath, undefined);
            }
        });
    }

    function onRead({ where, projection }) {
        where && this.or(...where);
        projection && this.select(projection);
    }

    async function onUpdate({ where, projection }) {
        where && this.or(...where);
        if (!projection) return;

        const existing = await this.model.findOne(this._conditions).setOptions({ lean: true });
        const exclusive = projection[Object.keys(projection)[0]] === 0;

        Object.keys(projection).forEach(path => {
            if ((exclusive && projection[path] === 0) || (!exclusive && !projection[path])) {
                const prevValue = lodash.get(existing, path);
                prevValue && lodash.set(this._update, path, prevValue);
            }
        });
    }

    schema.pre("save", createSecurityHandler("create", onSave));
    schema.pre("find", createSecurityHandler("read", onRead));
    schema.pre("findOne", createSecurityHandler("read", onRead));
    schema.pre("findOneAndUpdate", createSecurityHandler("update", onUpdate));
    schema.pre("findOneAndRemove", createSecurityHandler("delete", onRead));

};

export default securityPlugin;