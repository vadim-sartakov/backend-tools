class MongooseCrudModel {

    constructor(Model) {
        this.Model = Model;
    }

    async getAll({ page, size, filter, sort }) {
        if (filter.id) filter._id = filter.id;
        const getAllQuery = this.Model.find()
            .skip(page * size)
            .limit(size);
        if (filter) getAllQuery.where(filter);
        if (sort) getAllQuery.sort(sort);
        return await getAllQuery.exec();
    }

    async count(filter) {
        if (filter.id) filter._id = filter.id;
        const query = this.Model.count();
        if (filter) query.where(filter);
        return await query.exec();
    }

    async addOne(payload) {
        const doc = new this.Model(payload);
        return await doc.save();
    }

    async getOne(filter) {
        if (filter.id) filter._id = filter.id;
        return await this.Model.findOne(filter);
    }

    async updateOne(filter, payload) {
        if (filter.id) filter._id = filter.id;
        return await this.Model.findOneAndUpdate(filter, payload, { runValidators: true, context: 'query' });
    }

    async deleteOne(filter) {
        if (filter.id) filter._id = filter.id;
        return await this.Model.findOneAndDelete(filter);
    }

}

export default MongooseCrudModel;