import AccessDeniedError from "../error/accessDenied";

const ADMIN = "ADMIN";
const ADMIN_READ = "ADMIN_READ";

const security = schema => {

    const getUser = options => {
        const { res } = options;
        if (!res) throw new Error("No response was specified");
        const { user } = options.res.locals;
        if (!user) throw new Error("No user found in response locals");
        return user;
    };

    const getPermission = (user, action) => {

        return user.roles.reduce((prevPermission, role) => {

            if (role === ADMIN || (action === "read" && role === ADMIN_READ)) return true;

            const curPermissions = security[role] || {};
            let permission = prevPermission === true || curPermissions[action];
            if (permission && permission !== true) {
                const { where, projection } = permission;
                
            }

        });

    };

    const createQuerySecurityHandler = (action, callback) => function querySecurityHandler() {

        const user = getUser(this.options);
        const { security } = schema.security;

        if (!security) throw new Error(`No security defined in schema`);

        const permissions = getPermission(user, action);

        if (!permissions[action]) throw new AccessDeniedError();
        callback.call(this, permissions[action]);

    };

    function documentSecurityHandler() {
        this.isNew;
    }

    function onRead() {

    }

    schema.pre("save", documentSecurityHandler);
    schema.pre("find", createQuerySecurityHandler("read", onRead));
    schema.pre("findOne", createQuerySecurityHandler("read"));
    schema.pre("findOneAndUpdate", createQuerySecurityHandler("update"));
    schema.pre("findOneAndRemove", createQuerySecurityHandler("delete"));

};

export default security;