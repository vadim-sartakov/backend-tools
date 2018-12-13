import { filterObject } from "shared-tools";

class MongooseCrudModel {

    constructor(Model) {
        this.Model = Model;
    }

    getResultFilter(queryFilter, permissionFilter, masterPermission) {
        const filterArray = [];
        if (permissionFilter && !masterPermission) filterArray.push(permissionFilter);
        if (queryFilter) filterArray.push(queryFilter);
        let resultFilter;
        switch(filterArray.length) {
            case 1:
                resultFilter = filterArray[0];
                break;
            case 2:
                resultFilter = { $and: filterArray };
                break;
            default:
        }
        return resultFilter;
    }

    async getAll({ page, size, filter, sort }, permissions = { }) {
        const { filter: permissionFilter, read, readFields } = permissions;
        const getAllQuery = this.Model.find()
            .skip(page * size)
            .limit(size);
        if (readFields) getAllQuery.select(readFields);
        const resultFilter = this.getResultFilter(filter, permissionFilter, read);
        if (resultFilter) getAllQuery.where(resultFilter);
        if (sort) getAllQuery.sort(sort);
        getAllQuery.setOptions({ lean: true });
        return await getAllQuery.exec();
    }

    async count(filter, permissions = { }) {
        const { filter: permissionFilter, read } = permissions;
        const countQuery = this.Model.count();
        const resultFilter = this.getResultFilter(filter, permissionFilter, read);
        if (resultFilter) countQuery.where(resultFilter);
        return await countQuery.exec();
    }

    async addOne(payload, permissions = { }) {
        const { readFields, modifyFields } = permissions;
        if (modifyFields) payload = filterObject(payload, modifyFields);
        const doc = new this.Model(payload);
        let saved = await doc.save();
        saved = saved.toObject();
        if (readFields) saved = filterObject(saved, readFields);
        return saved;
    }

    async getOne(filter, permissions = { }) {
        filter = this.convertFitlerId(filter);
        const { filter: permissionFilter, readFields, read } = permissions;
        const resultFilter = this.getResultFilter(filter, permissionFilter, read);
        const query = this.Model.findOne(resultFilter);
        if (readFields) query.select(readFields);
        query.setOptions({ lean: true });
        return await query.exec();
    }

    convertFitlerId(filter) {
        let result;
        if (filter && filter.id) {
            result = { ...filter };
            result._id = result.id;
            delete result.id;
        }
        return result;
    }

    async updateOne(filter, payload, permissions = { }) {
        filter = this.convertFitlerId(filter);
        const { filter: permissionFilter, readFields, modifyFields, update } = permissions;
        const resultFilter = this.getResultFilter(filter, permissionFilter, update);
        const initialObject = modifyFields && await this.Model.findOne(resultFilter).lean();
        payload = ( modifyFields && filterObject(payload, modifyFields, initialObject) ) || payload;
        let updated = await this.Model.findOneAndUpdate(resultFilter, payload, { new: true, lean: true });
        if (readFields) updated = filterObject(updated, readFields);
        return updated;
    }

    async deleteOne(filter, permissions = { }) {
        filter = this.convertFitlerId(filter);
        const { filter: permissionFilter, readFields, delete: permissionDelete } = permissions;
        const resultFilter = this.getResultFilter(filter, permissionFilter, permissionDelete);
        let deleted = await this.Model.findOneAndDelete(resultFilter).lean();
        if (readFields) deleted = filterObject(deleted, readFields);
        return deleted;
    }

}

export default MongooseCrudModel;