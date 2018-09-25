const security = schema => {

    function securityHandler() {

        const securityOptions = schema.options.security || {};
        const { projection, filter } = securityOptions;
        const { user } = this.options;

        if (!user) return;

        const projectionValue = projection(user);
        const filterValue = filter(user);
        projectionValue && this.select(projectionValue);
        filterValue && this.where(filterValue);

    }

    schema.pre("find", securityHandler);
    schema.pre("findOne", securityHandler);
    schema.pre("findOneAndUpdate", securityHandler);
    schema.pre("findOneAndDelete", securityHandler);

};

export default security;