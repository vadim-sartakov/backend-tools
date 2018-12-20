import { filterObject } from "shared-tools";

const defaultPermissions = { create: { }, read: { }, update: { }, delete: { } };

class MongooseCrudModel {

    constructor(Model, opts = {}) {
        const { excerptProjection, populate } = opts;
        this.Model = Model;
        this.excerptProjection = excerptProjection;
        this.populate = populate;
    }

    getResultFilter(queryFilter, permissionFilter) {
        const filterArray = [];
        if (permissionFilter) filterArray.push(permissionFilter);
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

    async getAll({ page, size, filter, sort }, permissions) {
        permissions = { ...defaultPermissions, ...permissions };
        const { read: { filter: permissionFilter, projection: permissionProjection } } = permissions;
        const getAllQuery = this.Model.find()
            .skip(page * size)
            .limit(size);
        const projection = this.excerptProjection || permissionProjection;
        if (projection) getAllQuery.select(projection);
        const resultFilter = this.getResultFilter(filter, permissionFilter);
        if (resultFilter) getAllQuery.where(resultFilter);
        if (sort) getAllQuery.sort(sort);
        if (this.populate) getAllQuery.populate(this.populate);
        getAllQuery.setOptions({ lean: true });
        return await getAllQuery.exec();
    }

    async count(filter, permissions) {
        permissions = { ...defaultPermissions, ...permissions };
        const { read: { filter: permissionFilter } } = permissions;
        const countQuery = this.Model.count();
        const resultFilter = this.getResultFilter(filter, permissionFilter);
        if (resultFilter) countQuery.where(resultFilter);
        return await countQuery.exec();
    }

    async addOne(payload, permissions) {
        permissions = { ...defaultPermissions, ...permissions };
        const { update: { projection } } = permissions;
        if (projection) payload = filterObject(payload, projection);
        const doc = new this.Model(payload);
        let saved = await doc.save();
        return saved.toObject();
    }

    async getOne(filter, permissions) {
        filter = this.convertFitlerId(filter);
        permissions = { ...defaultPermissions, ...permissions };
        const { read: { filter: permissionFilter, projection } } = permissions;
        const resultFilter = this.getResultFilter(filter, permissionFilter);
        const query = this.Model.findOne(resultFilter);
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

    async updateOne(filter, payload, permissions) {
        filter = this.convertFitlerId(filter);
        permissions = { ...defaultPermissions, ...permissions };
        const { read: { filter: permissionFilter }, update: { projection } } = permissions;
        const resultFilter = this.getResultFilter(filter, permissionFilter);
        if (projection) {
            const initialObject = await this.Model.findOne(resultFilter).lean();
            payload = filterObject(payload, projection, initialObject);
        }
        const updated = await this.Model.findOneAndUpdate(resultFilter, payload, { new: true, lean: true });
        return updated;
    }

    async deleteOne(filter, permissions) {
        filter = this.convertFitlerId(filter);
        permissions = { ...defaultPermissions, ...permissions };
        const { read: { filter: permissionFilter } } = permissions;
        const resultFilter = this.getResultFilter(filter, permissionFilter);
        let deleted = await this.Model.findOneAndDelete(resultFilter).lean();
        return deleted;
    }

}

export default MongooseCrudModel;