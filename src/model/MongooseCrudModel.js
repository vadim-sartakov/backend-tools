import { flatten } from "flat";
import _ from "lodash";

class MongooseCrudModel {

    constructor(Model) {
        this.Model = Model;
    }

    getResultFilter(queryFilter, permissionFilter) {
        const filterArray = [];
        if (permissionFilter) filterArray.push(permissionFilter);
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
        const { filter: permissionFilter, readFields } = permissions;
        const getAllQuery = this.Model.find()
            .skip(page * size)
            .limit(size);
        if (readFields) getAllQuery.select(readFields);
        const resultFilter = this.getResultFilter(filter, permissionFilter);
        if (resultFilter) getAllQuery.where(resultFilter);
        if (sort) getAllQuery.sort(sort);
        return await getAllQuery.exec();
    }

    async count(filter, permissions = { }) {
        const { filter: permissionFilter } = permissions;
        const countQuery = this.Model.count();
        const resultFilter = this.getResultFilter(filter, permissionFilter);
        if (resultFilter) countQuery.where(resultFilter);
        return await countQuery.exec();
    }

    filterObject(payload, toMerge = {}, rootProperty, { fields, exclusive }) {
        return Object.keys(payload).reduce((prev, payloadProperty) => {
            const payloadValue = payload[payloadProperty];
            const mergeValue = toMerge[payloadProperty];
            const fullProperty = `${rootProperty ? rootProperty + "." : ""}${payloadProperty}`;
            let result;
            if ( ( exclusive && fields[fullProperty] === 0 ) ||
                    ( !exclusive && fields[fullProperty] === undefined && !Object.keys(fields).some(field => field.includes(fullProperty)) ) ) {
                result = mergeValue;
            } else if(Array.isArray(payloadValue)) {
                result = payloadValue.map( ( payloadItem, index ) => {
                    if (!this.isPlainObject) return payloadItem;
                    // Looking row with same id in `toMerge` object
                    const rowToMerge = mergeValue && mergeValue.find(mergeItem => mergeItem.id === payloadItem.id);
                    return this.filterObject(payloadValue[index], rowToMerge, fullProperty, { fields, exclusive });
                });
            } else if (this.isPlainObject(payloadValue)) {
                result = this.filterObject(payloadValue, mergeValue, fullProperty, { fields, exclusive });
            }  else {
                result = payloadValue;
            }
            return { ...prev, [payloadProperty]: result };
        }, { });
    }

    isPlainObject(value) {
        return typeof(value) === "object" && !(value instanceof Date);
    }

    filterPayload(payload, toMerge, fields) {
        const exclusive = this.isExclusiveProjection(fields);
        return this.filterObject(payload, toMerge, "", { fields, exclusive });
    }

    isExclusiveProjection(fields) {
        return fields[Object.keys(fields)[0]] === 0;
    }

    async addOne(payload, permissions = { }) {
        const { modifyFields } = permissions;
        if (modifyFields) payload = this.filterPayload(payload, { }, modifyFields);
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
        const $set = this.filterModifyPayload(payload, permissions);
        return await this.Model.findOneAndUpdate(filter, { $set });
    }

    async deleteOne(filter, permissions = { }) {
        if (filter && filter.id) filter._id = filter.id;
        return await this.Model.findOneAndDelete(filter);
    }

}

export default MongooseCrudModel;