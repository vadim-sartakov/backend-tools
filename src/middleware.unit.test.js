import { security, validator, unauthorized } from "./middleware";
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

describe("Middleware", () => {

  describe("Permissions", () => {

    let user, res, next;

    beforeEach(() => {
      user = { roles: ["USER"] };
      res = new StubResponse(user);
      next = new fake();
    });

    it("Granted read", () => {
      const schema = { "USER": { read: true } };
      const middleware = security(schema, "read");
      middleware({}, res, next);
      expect(res.locals.permissions).to.be.ok;
      expect(next).to.have.been.called;
    });

    it("Denied read", () => {
      const schema = { "USER": { update: true } };
      const middleware = security(schema, "read");
      middleware({}, res, next);
      expect(res.status).to.have.been.calledWith(403);
      expect(res.json).to.have.been.calledWith({ message: "Access is denied" });
    });

  });

  describe("Validator", () => {

    const validationErrorPart = { message: "Validation failed" };

    it("Success", () => {
      const constraints = { field: () => undefined };
      const next = fake();
      const middleware = validator(constraints);
      const res = new StubResponse({});
      middleware({ method: "POST", body: { field: "Bill" } }, res, next);
      expect(res.status).to.not.have.been.called;
      expect(res.json).to.not.have.been.called;
      expect(next).to.have.been.called;
    });

    it("Fail", () => {
      const constraints = { field: () => "Error" };
      const next = fake();
      const middleware = validator(constraints);
      const res = new StubResponse({});
      middleware({ method: "POST", body: {} }, res, next);
      expect(res.status).to.have.been.calledWith(400);
      expect(res.json).to.have.been.calledWith({ ...validationErrorPart, errors: { "field": "Error" } });
      expect(next).to.not.have.been.called;
    });

  });

  describe("Unauthorized", () => {

    it("Success", () => {
      const next = fake();
      const middleware = unauthorized();
      const res = new StubResponse({});
      middleware({}, res, next);
      expect(res.status).to.not.have.been.called;
      expect(res.json).to.not.have.been.called;
      expect(next).to.have.been.called;
    });

    it("Fail", () => {
      const next = fake();
      const middleware = unauthorized();
      const res = new StubResponse();
      middleware({}, res, next);
      expect(res.status).to.have.been.calledWith(401);
      expect(res.json).to.have.been.calledWith({ message: "Unathorized" });
      expect(next).to.not.have.been.called;
    });

  });

});

