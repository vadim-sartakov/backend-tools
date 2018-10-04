import mongoose from "mongoose";
import autopopulatePlugin from "mongoose-autopopulate";
import { eachPathRecursive } from "./utils";

const autopopulateFunction = function(opts) {

    if (!this._fields) return true; 
    
    const model = mongoose.model(opts.model);
    const { populateProjection } = model && model.schema.options;
    const selectFieldValue = this._fields[opts.path] || 0;
    const exclusiveSelect = this._fields[Object.keys(this._fields)[0]] === 0;

    if ((exclusiveSelect && selectFieldValue) || (!exclusiveSelect && !selectFieldValue)) return false;

    return { maxDepth: 1, select: populateProjection };

};

const autopopulate = function(schema) {

    eachPathRecursive(schema, (path, schemaType) => {
        if (!schemaType.options) return;
        let { options } = schemaType;
        options = Array.isArray(options.type) ? options.type[0] : options;
        if (options.ref && options.type.name === "ObjectId") {
            options.autopopulate = autopopulateFunction;
        }
    });

    autopopulatePlugin(schema);

};

export default autopopulate;