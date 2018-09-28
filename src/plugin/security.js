import AccessDeniedError from "../error/accessDenied";

const ADMIN = "ADMIN";
const ADMIN_READ = "ADMIN_READ";

export const getPermissions = (security, user, action) => {

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

        const where = prevPermission.where || [];
        where.push(permission.where(user));

        const prevProj = (prevPermission.projection && projectionToObject(prevPermission.projection)) || {};
        const curProj = (permission.projection && projectionToObject(permission.projection)) || {};

        return { where, projection: { ...prevProj, ...curProj } };

    }, false);

};

const securityPlugin = schema => {

    const { security } = schema.options;

    const getUser = options => {
        const { res } = options;
        if (!res) throw new Error("No response was specified");
        const { user } = options.res.locals;
        if (!user) throw new Error("No user found in response locals");
        return user;
    };

    const createQuerySecurityHandler = (action, callback) => function querySecurityHandler() {
        const user = getUser(this.options);
        const permissions = getPermissions(security, user, action);
        if (!permissions) throw new AccessDeniedError();
        callback.call(this, permissions);
    };

    function documentSecurityHandler() {
        this.isNew;
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