import CrudModel from "./CrudModel";

class MongooseCrudModel extends CrudModel {

    constructor(Model, opts = {}) {
        super(opts);
        const { populate } = opts;
        this.Model = Model;
        this.populate = populate;
    }

    searchFieldsToFilter(search, query) {
        return search.map(searchField => {
            return { [searchField]: new RegExp(`.*${query}.*`, 'i') };
        });
    }

    async execGetAll({ page, size, projection, filter, sort }) {
        const getAllQuery = this.Model.find()
            .skip(page * size)
            .limit(size);
        if (projection) getAllQuery.select(projection);
        if (filter) getAllQuery.where(filter);
        if (sort) getAllQuery.sort(sort);
        this.applyPopulateIfRequired(getAllQuery);
        getAllQuery.setOptions({ lean: true });
        return await getAllQuery.exec();
    }

    applyPopulateIfRequired(query) {
        if (this.populate) Object.keys(this.populate).forEach(path => query.populate({ path, select: this.populate[path] }));
    }

    async execCount(filter) {
        const countQuery = this.Model.count();
        if (filter) countQuery.where(filter);
        return await countQuery.exec();
    }

    async execAddOne(payload) {
        const doc = new this.Model(payload);
        let saved = await doc.save();
        return saved.toObject();
    }

    async execGetOne({ filter, projection }) {
        const query = this.Model.findOne(filter);
        if (projection) query.select(projection);
        this.applyPopulateIfRequired(query);
        query.setOptions({ lean: true });
        return await query.exec();
    }

    async execUpdateOne(filter, payload) {
        return await this.Model.findOneAndUpdate(filter, payload, { new: true, lean: true });;
    }

    async execDeleteOne(filter) {
        return await this.Model.findOneAndDelete(filter).lean();
    }

}

export default MongooseCrudModel;