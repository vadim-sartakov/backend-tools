import { securityFilter } from "./security";

describe("Security middleware", () => {
    it("Read permission", () => {
        const user = { roles: ["USER", "MODERATOR"] };
        const schema = { "USER": { read: true } };
        const middleware = securityFilter(schema, "read");
        middleware({ }, { locals: { user } }, () => {});
    });
});