import { flatten } from "flat";

class MongooseCrudModel {

    constructor(Model) {
        this.Model = Model;
    }

    async getAll({ page, size, filter, sort }, permissions = { }) {

        const { readFilter } = permissions;
        const getAllQuery = this.Model.find()
            .skip(page * size)
            .limit(size);
        const filterArray = [];
        if (readFilter) filterArray.push(readFilter);
        if (filter) filterArray.push(filter);

        let resultFilter;
        switch(filterArray.length) {
            case 1:
                resultFilter = filterArray[0]
                break;
            case 2:
                resultFilter = { $and: filterArray };
                break;
            default:
        }

        if (resultFilter) getAllQuery.where(resultFilter);

        if (sort) getAllQuery.sort(sort);
        return await getAllQuery.exec();

    }

    async count(filter, permissions) {
        const query = this.Model.count();
        if (filter) query.where(filter);
        return await query.exec();
    }

    async addOne(payload, permissions) {
        const doc = new this.Model(payload);
        return await doc.save();
    }

    async getOne(filter, permissions) {
        if (filter && filter.id) filter._id = filter.id;
        return await this.Model.findOne(filter);
    }

    async updateOne(filter, payload, permissions) {

        if (filter && filter.id) filter._id = filter.id;
        const { modifyFields } = permissions;

        let $set;
        if (modifyFields) {
            const flattened = flatten(payload);
            $set = Object.keys(flattened)
                .reduce((prev, property) => !modifyFields[property] ? prev : { ...prev, [property]: flattened.property }, { });
        } else {
            $set = payload;
        }

        return await this.Model.findOneAndUpdate(filter, { $set }, { runValidators: true, context: 'query' });

    }

    async deleteOne(filter, permissions) {
        if (filter && filter.id) filter._id = filter.id;
        return await this.Model.findOneAndDelete(filter);
    }

}

export default MongooseCrudModel;