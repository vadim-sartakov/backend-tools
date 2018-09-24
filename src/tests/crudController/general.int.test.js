import env from "../../config/env"; // eslint-disable-line no-unused-vars
import express from "express";
import mongoose from "mongoose";
import request from "supertest";
import { expect } from "chai";
import i18n from "../../plugin/i18n";
import generalMiddlewares from "../../middleware/general";
import httpMiddlewares from "../../middleware/http";
import { createI18n, createI18nMiddleware } from '../../middleware/i18n';
import crudRouter from "../../controller/crudController";
import { getNextPort, expectedLinks } from "../utils";
import { loadModels } from "../model/loader";

mongoose.plugin(i18n);

loadModels();

const User = mongoose.model("User");

describe("General crud integration tests", () => {

    const notFoundMessage = { message: "Not found" };
    const doc = { firstName: "Bill", lastName: "Gates", roles: [] };
    const diff = { firstName: "Steve" };

    let server, port;
    before(async () => {
        const app = express();
        app.use(generalMiddlewares);
        app.use(createI18nMiddleware(createI18n()));
        app.use("/users", crudRouter(User));
        app.use(httpMiddlewares);
        server = app.listen(getNextPort());
        port = server.address().port;
        await mongoose.connect(`${process.env.DB_URL}/crudGeneralTests`, { useNewUrlParser: true });
    });

    const dropCollection = async () => await User.deleteMany({ });
    beforeEach(dropCollection);
    afterEach(dropCollection);    

    after(async () => { 
        await mongoose.connection.dropDatabase();
        await mongoose.connection.close(true);
        server.close();
    });

    describe("Get all", () => {

        it("Get empty user list", async () => {
            const res = await request(server).get("/users").expect(200, []);
            expect(res.get("Link")).to.equal(expectedLinks({ first: 0, last: 0, size: 20, port }));
            expect(res.get("X-Total-Count")).to.equal("0");
        });

    });

    describe("Add one", () => {

        it("Add new user", async () => {

            const getIdFromLocation = location => {
                const regex = /.+\/(.+)/g;
                const id = regex.exec(location)[1];
                return id;
            };

            const res = await request(server).post("/users").send(doc).expect(201);
            const id = getIdFromLocation(res.headers.location);
            const instance = await User.findById(id);

            expect({ ...instance._doc, _id: instance.id }).to.deep.equal({ _id: id, ...doc }); 

        });

    });

    describe("Get one", () => {

        it("Get missing user", async () => {
            await request(server).get("/users/123").expect(404, notFoundMessage);
        });

        it("Get one user", async () => {
            const instance = await new User(doc).save();
            await request(server).get(`/users/${instance.id}`)
                    .expect(200, { ...doc, _id: instance.id }).send();
        });

    });

    describe("Update one", () => {

        it("Update missing user", async () => {
            await request(server).put(`/users/123`)
                .send({ ...doc, ...diff })
                .expect(404, notFoundMessage);
        });

        it("Update user", async () => {      
            const newInstance = await new User(doc).save();
            await request(server).put(`/users/${newInstance.id}`)
                .send({ ...doc, ...diff })
                .expect(200, { ...doc, _id: newInstance.id, ...diff });
        });

    });  

    describe("Delete one", () => {

        it("Delete missing user", async () => {
            await request(server).delete("/users/123").expect(404, notFoundMessage);
        });

        it("Delete user", async () => {
            const instance = await new User(doc).save();
            await request(server).delete(`/users/${instance.id}`).expect(204);
            expect(await User.findById(instance.id)).to.be.null;        
        });

    });

});
