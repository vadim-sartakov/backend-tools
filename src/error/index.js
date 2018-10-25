export class AccessDeniedError extends Error {
    constructor() {
        super("Access is denied");
        this.name = "AccessDenied";
    }
}

export class UnauthorizedError extends Error {
    constructor() {
        super("Unauthorized");
        this.name = "Unauthorized";
    }
}