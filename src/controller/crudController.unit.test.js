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
    constructor(opts = {}) {
        this.find = sinon.stub().returns(opts.findQuery);
        this.count = sinon.stub().returns(opts.countQuery);
        this.findOne = sinon.stub().returns(opts.findOneQuery);
        this.findOneAndUpdate = sinon.stub().returns(opts.findOneAndUpdateQuery);
        this.findOneAndDelete = sinon.stub().returns(opts.findOneAndDeleteQuery);
    }
}

describe('Crud controller tests', () => {

    let req, res, next;
    beforeEach(() => [req, res, next] = [new Req(), new Res(), sinon.stub()]);

    describe('Get all', () => {      

        describe('With default options', () => {

            it('Empty response', async () => {
                
                const opts = { findQuery: new Query([]), countQuery: new Query(0) };
                const modelInstance = new Model(opts);
                await createGetAll(modelInstance)(req, res, next);

                expect(opts.findQuery.select).not.been.called;
                expect(opts.findQuery.where).been.calledWith({ $and: [] });
                expect(opts.findQuery.skip).been.calledWith(0);
                expect(opts.findQuery.limit).been.calledWith(20);
                expect(opts.countQuery.where).been.calledWith({ $and: [] });
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
                
                const opts = { findQuery: new Query(entries), countQuery: new Query(90) };
                const modelInstance = new Model(opts);
                await createGetAll(modelInstance)(req, res, next);

                expect(opts.findQuery.select).not.been.called;
                expect(opts.findQuery.where).been.calledWith({ $and: [] });
                expect(opts.findQuery.skip).been.calledWith(0);
                expect(opts.findQuery.limit).been.calledWith(20);
                expect(opts.countQuery.where).been.calledWith({ $and: [] });
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

            const testException = async modelInstance => {
                await createGetAll(modelInstance)(req, res, next);
                expect(next).been.called;
                expect(res.json).not.been.called;
            };

            it('Error on select', async () => {
                const opts = { findQuery: new Query([], "error"), countQuery: new Query(0) };
                const modelInstance = new Model(opts);
                await testException(modelInstance);
            });

            it('Error on count', async () => {
                const opts = { findQuery: new Query([]), countQuery: new Query(0, "error") };
                const modelInstance = new Model(opts);
                await testException(modelInstance);
            });

        });

    });

});