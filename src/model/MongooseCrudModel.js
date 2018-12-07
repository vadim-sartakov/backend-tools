import { flatten } from "flat";
import _ from "lodash";

class MongooseCrudModel {

    constructor(Model) {
        this.Model = Model;
    }

    getResultFilter(queryFilter, readFilter) {
        const filterArray = [];
        if (readFilter) filterArray.push(readFilter);
        if (queryFilter) filterArray.push(queryFilter);
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
        return resultFilter;
    }

    async getAll({ page, size, filter, sort }, permissions = { }) {
        const { readFilter, readFields } = permissions;
        const getAllQuery = this.Model.find()
            .skip(page * size)
            .limit(size);
        if (readFields) getAllQuery.select(readFields);
        const resultFilter = this.getResultFilter(filter, readFilter);
        if (resultFilter) getAllQuery.where(resultFilter);
        if (sort) getAllQuery.sort(sort);
        return await getAllQuery.exec();
    }

    async count(filter, permissions = { }) {
        const { readFilter } = permissions;
        const countQuery = this.Model.count();
        const resultFilter = this.getResultFilter(filter, readFilter);
        if (resultFilter) countQuery.where(resultFilter);
        return await countQuery.exec();
    }

    isExclusiveProjection(fields) {
        return fields[Object.keys(fields)[0]] === 0;
    }

    filterModifyPayload(payload, permissions, handler) {
        const { modifyFields } = permissions;
        if (!modifyFields) return payload;
        payload = _.cloneDeep(payload);
        if (modifyFields) {
            const flattened = flatten(payload);
            const exclusive = this.isExclusiveProjection(modifyFields);
            Object.keys(flattened).forEach(flatProperty => {
                // If there is array, reducing property path to this array
                flatProperty = flatProperty.split(".")
                        .reduce((prev, cur) => Array.isArray(prev) ? prev : `${prev}.${cur}`);
                if ( ( exclusive && modifyFields[flatProperty] === 0 ) || ( !exclusive && modifyFields[flatProperty] === undefined ) ) {
                    handler(payload, flatProperty);
                }
            });
        }
        return payload;
    }

    async addOne(payload, permissions = { }) {
        payload = this.filterModifyPayload(payload, permissions, (object, property) => _.set(object, property, undefined));
        const doc = new this.Model(payload);
        const saved = await doc.save();
        return saved.toObject();
    }

    async getOne(filter, permissions = { }) {
        if (filter && filter.id) filter._id = filter.id;
        return await this.Model.findOne(filter);
    }

    async updateOne(filter, payload, permissions = { }) {
        if (filter && filter.id) {
            filter._id = filter.id;
            delete filter.id;
        }
        const $set = this.filterModifyPayload(payload, permissions, (object, property) => delete object[property]);
        return await this.Model.findOneAndUpdate(filter, { $set });
    }

    async deleteOne(filter, permissions = { }) {
        if (filter && filter.id) filter._id = filter.id;
        return await this.Model.findOneAndDelete(filter);
    }

}

export default MongooseCrudModel;