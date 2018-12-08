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
    
    let user, res, next;

    beforeEach(() => {
        user = { roles: ["USER"] };
        res = new StubResponse(user);
        next = new fake();
    });

    it("Granted read", () => {
        const schema = { "USER": { read: true } };
        const middleware = permissions(schema);
        middleware({ }, res, next);
        expect(res.locals.permissions).to.be.ok;
        expect(next).to.have.been.called;
    });    

    describe("Test denied", () => {

        const schema = { };
        const middleware = permissions(schema);

        const checkIfAccessIsDenied = (middleware, res, method) => {
            middleware({ method }, res, next);
            expect(res.status).to.have.been.calledWith(403);
            expect(res.json).to.have.been.calledWith({ message: "Access is denied" });
        };

        it("Denied create", () => {
            checkIfAccessIsDenied(middleware, res, "POST");
        });
    
        it("Denied read", () => {
            checkIfAccessIsDenied(middleware, res, "GET");
        });

        it("Denied update", () => {
            checkIfAccessIsDenied(middleware, res, "PUT");
        });
    
        it("Denied delete", () => {
            checkIfAccessIsDenied(middleware, res, "DELETE");
        });

    });

});