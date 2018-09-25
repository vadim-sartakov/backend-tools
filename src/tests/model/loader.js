
import { userSchema } from "./user";
import { roleSchema } from "./role";
import { departmentSchema } from "./department";

export const loadModels = (connection, ...plugins) => {
    connection.model("User", applyPlugins(plugins, userSchema()));
    connection.model("Role", applyPlugins(plugins, roleSchema()));
    connection.model("Department", applyPlugins(plugins, departmentSchema()));
};

const applyPlugins = (plugins, schema) => {
    plugins && plugins.forEach(plugin => schema.plugin(plugin));
    return schema;
};