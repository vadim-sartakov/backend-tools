import crudRouter from "./crudController";

function Model(doc) {

    this;

    this.doc = doc;
    this.modelName = "users";
    this.save = jest.fn();
    this.find = jest.fn();
    this.findById = jest.fn();
    this.findByIdAndUpdate = jest.fn();

}

const ModelMock = jest.fn(Model);

describe("Crud controller unit tests", () => {

    let router;

    test("Crud controller unit test", () => {
        expect(1).toEqual(1);
    });

});