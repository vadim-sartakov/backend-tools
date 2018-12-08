import { permissions } from "./middleware";
import chai, { expect } from "chai";
import sinonChai from "sinon-chai";
import { fake } from "sinon";

chai.use(sinonChai);

class StubResponse {
    constructor(user) {
        this.locals = { user };
        this.status = fake();
        this.json = fake();
    }
}

describe("Permissions middleware", () => {
    
    it("Granted permission", () => {
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
            "filter": false,
            "readFields": false,
            "modifyFields": false
        });
        expect(next).to.have.been.called;
    });

    const checkIfAccessIsDenied = (middleware, res, ...methods) => {
        methods.forEach(method => {
            middleware({ method }, res);
            expect(res.status).to.have.been.calledWith(403);
            expect(res.json).to.have.been.calledWith({ message: "Access is denied" });
        });
    };

    it("Denied read allowed modify", () => {
        const user = { roles: ["USER"] };
        const schema = { "USER": { modify: true } };
        const middleware = permissions(schema);
        const res = new StubResponse(user);
        checkIfAccessIsDenied(middleware, res, "GET");
        const next = fake();
        middleware({ method: "POST" }, { locals: { user } }, next);
        expect(next).to.have.been.called;
    });

    it("Denied modify allowed read", () => {
        const user = { roles: ["USER"] };
        const schema = { "USER": { read: true } };
        const middleware = permissions(schema);
        const res = new StubResponse(user);
        checkIfAccessIsDenied(middleware, res, "POST", "PUT", "DELETE");
        const next = fake();
        middleware({ method: "GET" }, res, next);
        expect(next).to.have.been.called;
    });

});