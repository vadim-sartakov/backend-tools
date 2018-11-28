'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
var eachPathRecursive = exports.eachPathRecursive = function eachPathRecursive(schema, handler) {
    var path = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [];

    schema.eachPath(function (pathname, schemaType) {
        path.push(pathname);
        if (schemaType.schema) {
            eachPathRecursive(schemaType.schema, handler, path);
        } else {
            handler(path.join('.'), schemaType);
        }
        path.pop();
    });
};
//# sourceMappingURL=utils.js.map