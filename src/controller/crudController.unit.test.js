import chai, { expect } from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import { createGetAll } from './crudController';

chai.use(sinonChai);

class Req {
    constructor(query) {
        this.query = query || {};
        this.protocol = 'http';
        this.get = sinon.stub().withArgs('host').returns('localhost');
        this.originalUrl ='/';
    }
}

class Res {
    constructor() {
        this.status = sinon.stub().returns(this);
        this.set = sinon.stub().returns(this);
        this.json = sinon.stub().returns(this);
    }
}

class Query {
    constructor(resolves, rejects) {
        this.limit = sinon.stub().returns(this);
        this.skip = sinon.stub().returns(this);
        this.where = sinon.stub().returns(this);
        this.select = sinon.stub().returns(this);
        this.populate = sinon.stub().returns(this);
        this.sort = sinon.stub().returns(this);
        this.exec = (rejects && sinon.stub().rejects(rejects)) || sinon.stub().resolves(resolves);
    }
}

class Model {
    constructor({ find, count, findOne, findOneAndUpdate, findOneAndDelete }) {
        this.find = sinon.stub().returns(find);
        this.count = sinon.stub().returns(count);
        this.findOne = sinon.stub().returns(findOne);
        this.findOneAndUpdate = sinon.stub().returns(findOneAndUpdate);
        this.findOneAndDelete = sinon.stub().returns(findOneAndDelete);
    }
}

describe('Crud controller tests', () => {

    let req, res, next;
    beforeEach(() => [req, res, next] = [new Req(), new Res(), sinon.stub()]);

    describe('Get all', () => {      

        describe('Common flow with default options', () => {

            it('Empty response', async () => {
                
                const find = new Query([]);
                const count = new Query(0);
                const queries = { find, count };
                const modelInstance = new Model(queries);
                await createGetAll(modelInstance)(req, res, next);

                expect(find.select).not.been.called;
                expect(find.sort).not.been.called;
                expect(find.where).been.calledWith({ $and: [] });
                expect(find.skip).been.calledWith(0);
                expect(find.limit).been.calledWith(20);
                expect(count.where).been.calledWith({ $and: [] });
                expect(res.set).been.calledWith("X-Total-Count", 0);
                expect(res.set).been.calledWith("Link", 
                    "<http://localhost/?page=0&size=20>; rel=first, " +
                    "<http://localhost/?page=0&size=20>; rel=previous, " +
                    "<http://localhost/?page=0&size=20>; rel=next, " +
                    "<http://localhost/?page=0&size=20>; rel=last");
                expect(next).not.been.called;
                expect(res.json).been.calledWith([]);

            });

            it('Response with multiple entries', async () => {

                const entries = [];
                for (let id = 0; id < 90; id++) entries.push({ id });
                
                const find = new Query(entries);
                const count = new Query(90);
                const queries = { find, count };

                const modelInstance = new Model(queries);
                await createGetAll(modelInstance)(req, res, next);

                expect(find.select).not.been.called;
                expect(find.sort).not.been.called;
                expect(find.where).been.calledWith({ $and: [] });
                expect(find.skip).been.calledWith(0);
                expect(find.limit).been.calledWith(20);
                expect(count.where).been.calledWith({ $and: [] });
                expect(res.set).been.calledWith("X-Total-Count", 90);
                expect(res.set).been.calledWith("Link", 
                    "<http://localhost/?page=0&size=20>; rel=first, " +
                    "<http://localhost/?page=0&size=20>; rel=previous, " +
                    "<http://localhost/?page=1&size=20>; rel=next, " +
                    "<http://localhost/?page=4&size=20>; rel=last");
                expect(next).not.been.called;
                expect(res.json).been.called;
                expect(res.json).been.calledWith(entries);

            });

            it('Error on select', async () => {
                const queries = { find: new Query([], "error"), count: new Query(0) };
                const modelInstance = new Model(queries);
                await createGetAll(modelInstance)(req, res, next);
                expect(next).been.called;
                expect(res.json).not.been.called;
            });

            it('Error on count', async () => {
                const queries = { find: new Query([]), count: new Query(0, "error") };
                const modelInstance = new Model(queries);
                await createGetAll(modelInstance)(req, res, next);
                expect(next).been.called;
                expect(res.json).not.been.called;
            });

        });

        describe('With specified options', () => {

            it('Custom security', async () => {
                const queries = { find: new Query([]), count: new Query(0) };
                const modelInstance = new Model(queries);
                const getAll = createGetAll(modelInstance, { securityCallback: () => ({ field: "value" }) });
                await getAll(req, res, next);
                expect(queries.find.where).been.calledWith({ $and: [ { field: "value" } ] });
            });

            it('Custom security and filter', async () => {
                req.query = { filter: "number=1,string=test" };
                const queries = { find: new Query([]), count: new Query(0) };
                const modelInstance = new Model(queries);
                const getAll = createGetAll(modelInstance, { securityCallback: () => ({ field: "value" }) });
                await getAll(req, res, next);
                expect(queries.find.where).been.calledWith({ $and: [ { field: "value" }, { number: "1", string: "test" } ] });
            });
            
        });

    });

});