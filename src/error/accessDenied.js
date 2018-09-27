class AccessDeniedError extends Error {
    constructor() {
        super("Access is denied");
        this.name = "AccessDenied";
    }
}

export default AccessDeniedError;