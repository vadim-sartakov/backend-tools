const security = schema => {

    const getOptions = options => {
        const { res, roles } = options;
        if (!res) throw new Error("No response was specified");
        const { user } = options.res.locals;
        if (!user) throw new Error("No user found in response locals");
        if (!roles) throw new Error("No roles was specified");
        return { roles, user };
    };

    function querySecurityHandler() {

        const { roles, user } = getOptions(this.options);
        user.roles.forEach(role => {
            const { permissions } = roles[role] || { };
            const { filter } = (permissions && permissions.model[this.model.modelName]) || { };
            filter && this.or(filter);
        });

        /*const securityOptions = schema.options.security || {};
        const { projection, filter } = securityOptions;

        if (!user) return;

        const projectionValue = projection(user);
        const filterValue = filter(user);
        projectionValue && this.select(projectionValue);
        filterValue && this.and(filterValue);*/

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