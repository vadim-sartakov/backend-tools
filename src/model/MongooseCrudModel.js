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
        const { filter: permissionFilter, read, fields, readFields, getAllFields } = permissions;
        const getAllQuery = this.Model.find()
            .skip(page * size)
            .limit(size);
        const projection = fields || readFields || getAllFields;
        if (projection) getAllQuery.select(projection);
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
        const { fields, readFields, modifyFields } = permissions;
        const modifyProjection = fields || modifyFields;
        const readProjection = fields || readFields;
        if (modifyProjection) payload = filterObject(payload, modifyProjection);
        const doc = new this.Model(payload);
        let saved = await doc.save();
        saved = saved.toObject();
        if (readProjection) saved = filterObject(saved, readProjection);
        return saved;
    }

    async getOne(filter, permissions = { }) {
        filter = this.convertFitlerId(filter);
        const { filter: permissionFilter, read, fields, readFields, getOneFields } = permissions;
        const resultFilter = this.getResultFilter(filter, permissionFilter, read);
        const query = this.Model.findOne(resultFilter);
        const projection = fields || readFields || getOneFields;
        if (projection) query.select(projection);
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
        const { filter: permissionFilter, fields, readFields, modifyFields, update } = permissions;
        const resultFilter = this.getResultFilter(filter, permissionFilter, update);
        const modifyProjection = fields || modifyFields;
        const readProjection = fields || readFields;
        const initialObject = modifyProjection && await this.Model.findOne(resultFilter).lean();
        payload = ( modifyProjection && filterObject(payload, modifyProjection, initialObject) ) || payload;
        let updated = await this.Model.findOneAndUpdate(resultFilter, payload, { new: true, lean: true });
        if (readProjection) updated = filterObject(updated, readProjection);
        return updated;
    }

    async deleteOne(filter, permissions = { }) {
        filter = this.convertFitlerId(filter);
        const { filter: permissionFilter, fields, readFields, delete: permissionDelete } = permissions;
        const resultFilter = this.getResultFilter(filter, permissionFilter, permissionDelete);
        let deleted = await this.Model.findOneAndDelete(resultFilter).lean();
        const projection = fields || readFields;
        if (projection) deleted = filterObject(deleted, projection);
        return deleted;
    }

}

export default MongooseCrudModel;