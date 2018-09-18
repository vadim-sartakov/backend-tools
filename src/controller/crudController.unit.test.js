import chai, { expect } from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import { createGetAll } from './crudController';

chai.use(sinonChai);

class ReqMock {
    constructor(query) {
        this.query = query || {};
        this.protocol = "http";
        this.get = sinon.stub().withArgs('host').returns('localhost');
        this.originalUrl ="/";
    }
}

class ResMock {
    constructor() {
        this.status = sinon.stub().returns(this);
        this.set = sinon.stub().returns(this);
        this.json = sinon.stub().returns(this);
    }
}

class MongooseModel {
    constructor(result, count) {
        this.find = sinon.stub().returns(this);
        this.limit = sinon.stub().returns(this);
        this.skip = sinon.stub().returns(this);
        this.where = sinon.stub().returns(this);
        this.select = sinon.stub().returns(this);
        this.populate = sinon.stub().returns(this);
        this.sort = sinon.stub().returns(this);
        this.exec = () => Promise.resolve(result || {});
        this.count = () => Promise.resolve(count || 0);
    }
}

describe('Crud controller tests', () => {

    let req, res, next;
    beforeEach(() => [req, res, next] = [new ReqMock(), new ResMock(), sinon.stub()]);

    describe('Get all', () => {      

        describe('With default options', () => {

            it('Empty response', async () => {

                const modelInstance = new MongooseModel([], 0);
                await createGetAll(modelInstance)(req, res, next);

                expect(modelInstance.select).not.been.called;
                expect(modelInstance.where).been.calledWith({ $and: [] });
                expect(modelInstance.skip).been.calledWith(0);
                expect(modelInstance.limit).been.calledWith(20);
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
                
                const modelInstance = new MongooseModel(entries, 90);
                await createGetAll(modelInstance)(req, res, next);

                expect(modelInstance.select).not.been.called;
                expect(modelInstance.where).been.calledWith({ $and: [] });
                expect(modelInstance.skip).been.calledWith(0);
                expect(modelInstance.limit).been.calledWith(20);
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
                const modelInstance = new MongooseModel([], 0);
                modelInstance.exec = sinon.stub().rejects("error");
                await testException(modelInstance);
            });

            it('Error on count', async () => {
                const modelInstance = new MongooseModel([], 0);
                modelInstance.count = sinon.stub().rejects("error");
                await testException(modelInstance);
            });

        });

    });

});