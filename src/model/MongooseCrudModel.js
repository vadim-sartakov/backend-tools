class MongooseCrudModel {

  constructor(Model) {
    this.Model = Model;
  }

  async getAll({ page, size, filter, projection, sort, search }) {
    return this.Model.graphFind({ page, size, filter, projection, sort, search });
  }

  async count(filter) {
    return this.Model.count(filter);
  }

  async getOne(filter, projection) {
    return this.Model.graphFindOne({ filter, projection });
  }

  async addOne(payload) {
    const instance = await new this.Model(payload).save();
    const saved = await instance.save();
    return saved;
  }

  async updateOne(filter, payload) {
    return await this.Model.findOneAndUpdate(filter, payload, { new: true });
  }

  async deleteOne(filter) {
    return await this.Model.findOneAndDelete(filter).lean();
  }

}

export default MongooseCrudModel;