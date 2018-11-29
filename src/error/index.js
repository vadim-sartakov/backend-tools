export class ValidationError extends Error {
    constructor() {
        super("Validation failed");
        this.name = "ValidationFailed";
    }
}

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