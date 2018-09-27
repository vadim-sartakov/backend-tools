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

    function querySecurityHandler() {

        const user = getUser(this.options);
        /*const resultPermissions = user.roles.reduce((prev, role) => {
            
            const { permissions } = roles[role] || { };
            const curRead = permissions.model[this.model.modelName].read;
            let { read } = (prev.read === true) || (role === ADMIN || role === ADMIN_READ) || curRead;

            if (read !== true && typeof read === "object") {
                read = ;
            };

            return { read };

        }, {});
        switch(this.operation) {
            case "find":
                if(!resultPermissions.read) throw new AccessDeniedError();
                break;
            case "update":
                if(!resultPermissions.update) throw new AccessDeniedError();
                break;
            case "remove":
                if(!resultPermissions.delete) throw new AccessDeniedError();
                break;
        }
        user.roles.forEach(role => {
            const { permissions } = roles[role] || { };
            const { read } = (permissions && permissions.model[this.model.modelName]) || { };
            if (typeof read === "object") {

            }
            filter && this.or(filter);
        });*/

    }

    function documentSecurityHandler() {
        this.isNew;
    }

    schema.pre("save", documentSecurityHandler);

    schema.pre("find", querySecurityHandler);
    schema.pre("findOne", querySecurityHandler);
    schema.pre("findOneAndUpdate", querySecurityHandler);
    schema.pre("findOneAndRemove", querySecurityHandler);

};

export default security;