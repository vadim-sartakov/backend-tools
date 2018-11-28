import env from "../../src/config/env"; // eslint-disable-line no-unused-vars
import express from "express";
import mongoose, { Schema } from "mongoose";
import request from "supertest";
import { expect } from "chai";
import commonMiddlewares from "../../src/middleware/common";
import { notFound, internalError } from "../../src/middleware/http";
import { createI18n, createI18nMiddleware } from '../../src/config/i18n';
import crudRouter from "../../src/router/crud";
import { getNextPort, expectedLinks } from "../utils";

describe("General crud integration tests", () => {

    const notFoundMessage = { message: "Not found" };
    const bill = { firstName: "Bill", lastName: "Gates" };
    const userSchema = new Schema({
        firstName: { type: String, required: true },
        lastName: { type: String, required: true }
    }, { versionKey: false });

    let server, port, connection, User;
    before(async () => {

        connection = await mongoose.createConnection(`${process.env.DB_URL}/crudGeneralTests`, { useNewUrlParser: true });
        User = connection.model("User", userSchema);

        const app = express();
        app.use(commonMiddlewares);
        app.use(createI18nMiddleware(createI18n()));
        app.use("/users", crudRouter(User));
        app.use(notFound());
        app.use(internalError());
        server = app.listen(getNextPort());
        port = server.address().port;
        
    });

    const dropCollection = async () => await User.deleteMany({ });
    beforeEach(dropCollection);
    afterEach(dropCollection);    

    after(async () => {
        await connection.dropDatabase();
        await connection.close(true);
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

            const res = await request(server).post("/users").send(bill).expect(201);
            const id = getIdFromLocation(res.headers.location);
            const instance = await User.findById(id);

            expect({ ...instance._doc, _id: instance.id }).to.deep.equal({ _id: id, ...bill }); 

        });

        it("Add invalid user", async () => {
            const res = await request(server).post("/users").send({});
            expect(res.status).equal(400);
            expect(res.body).to.have.nested.property("name", "ValidationError");
        });

    });

    describe("Get one", () => {

        it("Get missing user", async () => {
            await request(server).get("/users/5bb20e23ed343a54b4d60c39").expect(404, notFoundMessage);
        });

        it("Get one user", async () => {
            const instance = await new User(bill).save();
            await request(server).get(`/users/${instance.id}`)
                    .expect(200, { ...bill, _id: instance.id }).send();
        });

    });

    describe("Update one", () => {

        const diff = { firstName: "Steve" };

        it("Update missing user", async () => {
            await request(server).put(`/users/5bb20e23ed343a54b4d60c39`)
                .send({ ...bill, ...diff })
                .expect(404, notFoundMessage);
        });

        it("Update user", async () => {      
            const newInstance = await new User(bill).save();
            await request(server).put(`/users/${newInstance.id}`)
                .send({ ...bill, ...diff })
                .expect(200, { ...bill, _id: newInstance.id, ...diff });
        });

        it("Update user with invalid values", async () => {
            const newInstance = await new User(bill).save();
            const res = await request(server).put(`/users/${newInstance.id}`).send({ firstName: "" });
            expect(res.status).equal(400);
            expect(res.body).to.have.nested.property("name", "ValidationError");
        });

    });  

    describe("Delete one", () => {

        it("Delete missing user", async () => {
            await request(server).delete("/users/5bb20e23ed343a54b4d60c39").expect(404, notFoundMessage);
        });

        it("Delete user", async () => {
            const instance = await new User(bill).save();
            await request(server).delete(`/users/${instance.id}`).expect(204);
            expect(await User.findById(instance.id)).to.be.null;        
        });

    });

});
