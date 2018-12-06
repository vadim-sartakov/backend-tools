import { securityFilter } from "./middleware";
import chai, { expect } from "chai";
import sinonChai from "sinon-chai";
import { fake } from "sinon";

chai.use(sinonChai);

describe("Security middleware", () => {
    it("Read permission", () => {
        const user = { roles: ["USER", "MODERATOR"] };
        const schema = { "USER": { read: true } };
        const middleware = securityFilter(schema, "read", "write");
        const res = { locals: { user } };
        const next = fake();
        middleware({ }, res, next);
        expect(res).to.have.nested.property("locals.security");
        expect(next).to.have.been.called;
    });
});