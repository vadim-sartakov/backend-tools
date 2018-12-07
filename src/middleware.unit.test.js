import { permissions } from "./middleware";
import chai, { expect } from "chai";
import sinonChai from "sinon-chai";
import { fake } from "sinon";

chai.use(sinonChai);

describe("Permissions middleware", () => {
    it("Read permission", () => {
        const user = { roles: ["USER", "MODERATOR"] };
        const schema = { "USER": { read: true }, "MODERATOR": { modify: true } };
        const middleware = permissions(schema);
        const res = { locals: { user } };
        const next = fake();
        middleware({ }, res, next);
        expect(res.locals.permissions).to.be.ok;
        expect(res.locals.permissions).to.deep.equal({
            "read": true,
            "modify": true,
            "readFilter": false,
            "modifyFilter": false,
            "readFields": false,
            "modifyFields": false
        });
        expect(next).to.have.been.called;
    });
});