import express from "express";
import bodyParser from "body-parser";
import chai, { expect } from "chai";
import { fake } from "sinon";
import sinonChai from "sinon-chai";
import request from "supertest";
import qs from "qs";

import CrudRouter from "./crud";

chai.use(sinonChai);

const expectedLinks = ({ first, prev, next, last, size }) =>
  `<http:(.+)\\?page=${first}&size=${size}>; rel=first, ` +
  `${prev !== undefined ? `<http:(.+)\\?page=${prev}&size=${size}>; rel=previous, ` : ""}` +
  `${next !== undefined ? `<http:(.+)\\?page=${next}&size=${size}>; rel=next, ` : ""}` +
  `<http:(.+)\\?page=${last}&size=${size}>; rel=last`;
class StubModel {
  constructor({ getAllResult, countResult, addOneResult, getOneResult, updateOneResult, deleteOneResult }) {
    this.getAll = getAllResult !== undefined && fake(async () => getAllResult);
    this.count = countResult !== undefined && fake(async () => countResult);
    this.addOne = addOneResult !== undefined && fake(async () => addOneResult);
    this.getOne = getOneResult !== undefined && fake(async () => getOneResult);
    this.updateOne = updateOneResult !== undefined && fake(async () => updateOneResult);
    this.deleteOne = deleteOneResult !== undefined && fake(async () => deleteOneResult);
  }
}

describe.only("Crud router", () => {

  const getBulkResult = entryCount => {
    const result = [];
    for (let id = 0; id < entryCount; id++) {
      result.push({ id });
    }
    return result;
  };

  const initialize = (modelArgs, routerOptions, user) => {
    const model = new StubModel(modelArgs);
    const router = new CrudRouter(model, routerOptions);
    const app = express();
    app.use(bodyParser.json());
    user && app.use((req, res, next) => {
      res.locals.user = user;
      next();
    });
    app.use(router);
    return { model, app };
  };

  describe("Get all", () => {

    it("Get empty page", async () => {
      const { model, app } = initialize({ getAllResult: [], countResult: 0 });
      const res = await request(app).get("/").expect(200, []);
      expect(model.getAll).to.have.been.calledWith({ page: 0, size: 20, filter: undefined, sort: undefined, search: undefined }, undefined);
      expect(model.count).to.have.been.calledWith(undefined, undefined);
      expect(res.get("Link")).to.match(new RegExp(expectedLinks({ first: 0, last: 0, size: 20 })));
      expect(res.get("X-Total-Count")).to.equal("0");
    });

    it("Get default page", async () => {
      const { model, app } = initialize({ getAllResult: getBulkResult(20), countResult: 50 });
      const res = await request(app).get("/").expect(200);
      expect(model.getAll).to.have.been.calledWith({ page: 0, size: 20, filter: undefined, sort: undefined, search: undefined }, undefined);
      expect(model.count).to.have.been.calledWith(undefined, undefined);
      expect(res.get("Link")).to.match(new RegExp(expectedLinks({ first: 0, next: 1, last: 2, size: 20 })));
      expect(res.get("X-Total-Count")).to.equal("50");
      expect(res.body.length).to.equal(20);
    });

    it("Get user page 0 with size 5", async () => {
      const { model, app } = initialize({ getAllResult: getBulkResult(5), countResult: 42 });
      const res = await request(app).get("/").query({ page: 0, size: 5 }).expect(200);
      expect(model.getAll).to.have.been.calledWith({ page: 0, size: 5, filter: undefined, sort: undefined, search: undefined }, undefined);
      expect(model.count).to.have.been.calledWith(undefined, undefined);
      expect(res.get("Link")).to.match(new RegExp(expectedLinks({ first: 0, next: 1, last: 8, size: 5 })));
      expect(res.get("X-Total-Count")).to.equal("42");
      expect(res.body.length).to.equal(5);
    });

    it("Get user page 3 with size 5", async () => {
      const { model, app } = initialize({ getAllResult: getBulkResult(5), countResult: 42 });
      const res = await request(app).get("/").query({ page: 3, size: 5 }).expect(200);
      expect(model.getAll).to.have.been.calledWith({ page: 3, size: 5, filter: undefined, sort: undefined, search: undefined }, undefined);
      expect(model.count).to.have.been.calledWith(undefined, undefined);
      expect(res.get("Link")).to.match(new RegExp(expectedLinks({ first: 0, prev: 2, next: 4, last: 8, size: 5 })));
      expect(res.get("X-Total-Count")).to.equal("42");
      expect(res.body.length).to.equal(5);
    });

    it("Get user last page with size 5", async () => {
      const { model, app } = initialize({ getAllResult: getBulkResult(2), countResult: 42 });
      const res = await request(app).get("/").query(qs.stringify({ page: 8, size: 5 })).expect(200);
      expect(model.getAll).to.have.been.calledWith({ page: 8, size: 5, filter: undefined, sort: undefined, search: undefined }, undefined);
      expect(model.count).to.have.been.calledWith(undefined, undefined);
      expect(res.get("Link")).to.match(new RegExp(expectedLinks({ first: 0, prev: 7, last: 8, size: 5 })));
      expect(res.get("X-Total-Count")).to.equal("42");
      expect(res.body.length).to.equal(2);
    });

    it("With filter", async () => {
      const { model, app } = initialize({ getAllResult: getBulkResult(1), countResult: 1 });
      const filter = { email: "mail1@mail.com" };
      const res = await request(app).get("/")
        .query(qs.stringify({ filter }))
        .expect(200);
      expect(model.getAll).to.have.been.calledWith({ page: 0, size: 20, filter, sort: undefined, search: undefined }, undefined);
      expect(model.count).to.have.been.calledWith(filter, undefined);
      expect(res.get("X-Total-Count")).to.equal("1");
      expect(res.body.length).to.equal(1);
    });

    it("Page 1 with size 10 with filter", async () => {
      const { model, app } = initialize({ getAllResult: getBulkResult(1), countResult: 50 });
      const filter = { email: "mail1@mail.com" };
      const res = await request(app).get("/")
        .query(qs.stringify({ filter, page: 1, size: 5 }))
        .expect(200);
      expect(model.getAll).to.have.been.calledWith({ page: 1, size: 5, filter, sort: undefined, search: undefined }, undefined);
      expect(model.count).to.have.been.calledWith(filter, undefined);
      expect(res.get("X-Total-Count")).to.equal("50");
      expect(res.body.length).to.equal(1);
    });

  });

  describe("Add one", () => {

    it("Add new user", async () => {
      const instance = { id: "0" };
      const { model, app } = initialize({ addOneResult: instance, getOneResult: { ...instance, created: true } });
      const getIdFromLocation = location => {
        const regex = /.+\/(.+)/g;
        const id = regex.exec(location)[1];
        return id;
      };
      const res = await request(app).post("/").send(instance).expect(201, { ...instance, created: true });
      const id = getIdFromLocation(res.headers.location);
      expect(id).to.equal(instance.id);
      expect(model.addOne).to.have.been.calledWith(instance, undefined);
    });

  });

  describe("Get one", () => {

    it("Get missing user", async () => {
      const { model, app } = initialize({ getOneResult: null });
      await request(app).get("/0").expect(404);
      expect(model.getOne).to.have.been.calledWith({ id: "0" }, undefined);
    });

    it("Get one user", async () => {
      const instance = { firstName: "Steve" };
      const { model, app } = initialize({ getOneResult: instance });
      await request(app).get("/0").expect(200, instance);
      expect(model.getOne).to.have.been.calledWith({ id: "0" }, undefined);
    });

  });

  describe("Update one", () => {

    it("Update missing user", async () => {
      const instance = { firstName: "Steve" };
      const { model, app } = initialize({ updateOneResult: null });
      await request(app).put("/0").send(instance).expect(404);
      expect(model.updateOne).to.have.been.calledWith({ id: "0" }, instance, undefined);
    });

    it("Update user", async () => {
      const instance = { firstName: "Steve" };
      const { model, app } = initialize({ updateOneResult: instance, getOneResult: { ...instance, updated: true } }, { returnValue: true });
      await request(app).put("/0").send(instance).expect(200, { ...instance, updated: true });
      expect(model.updateOne).to.have.been.calledWith({ id: "0" }, instance, undefined);
    });

  });

  describe("Delete one", () => {

    it("Delete missing user", async () => {
      const { model, app } = initialize({ deleteOneResult: null });
      await request(app).delete("/0").expect(404);
      expect(model.deleteOne).to.have.been.calledWith({ id: "0" }, undefined);
    });

    it("Delete user", async () => {
      const instance = { firstName: "Steve" };
      const { model, app } = initialize({ deleteOneResult: instance });
      await request(app).delete("/0").expect(204);
      expect(model.deleteOne).to.have.been.calledWith({ id: "0" }, undefined);
    });

  });

  describe("Security and validation", () => {

    it("Granted read", async () => {
      const securitySchema = { "USER": { read: true } };
      const { app } = initialize({ getAllResult: getBulkResult(1), countResult: 50 }, { securitySchema }, { roles: ["USER"] });
      await request(app).get("/").expect(200);
    });

    it("Denied update", async () => {
      const securitySchema = { "USER": { read: true } };
      const { app } = initialize({ updateOneResult: { firstName: "Steve" } }, { securitySchema }, { roles: ["USER"] });
      await request(app).put("/1").send({}).expect(403);
    });

    it("Allowed update with validation fail", async () => {
      const securitySchema = { "USER": { update: true } };
      const validationSchema = { firstName: () => "Error" };
      const { app } = initialize({ updateOneResult: { firstName: "Steve" } }, { securitySchema, validationSchema }, { roles: ["USER"] });
      await request(app).put("/1").send({ firstName: "Bill" }).expect(400);
    });

    it("No triggered validation on get", async () => {
      const validationSchema = { firstName: () => undefined };
      const { app } = initialize({ getOneResult: { firstName: "Steve" } }, { validationSchema }, { roles: ["USER"] });
      await request(app).get("/1").send({ firstName: "Bill*" }).expect(200);
    });

    it("Triggered validation on post", async () => {
      const validationSchema = { firstName: () => "Error" };
      const { app } = initialize({ addOneResult: { firstName: "Steve" } }, { validationSchema }, { roles: ["USER"] });
      await request(app).post("/").send({ firstName: "Bill" }).expect(400);
    });

  });

});