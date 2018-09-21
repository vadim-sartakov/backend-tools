import autopopulatePlugin from 'mongoose-autopopulate';
import { eachPathRecursive } from './utils';

const autopopulateFunction = function(opts) {
    if (!this._fields) return true;
    const selectValue = this._fields[opts.path] || 0;
    const exclusiveSelect = this._fields[Object.keys(this._fields)[0]] === 0;
    return exclusiveSelect ? !selectValue : selectValue;
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