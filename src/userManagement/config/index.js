import User from '../model/user';
import { routeMap, bindRoutes, getAll } from '../../controller/crudController';
import registerController from '../controller/registerController';

const initialize = app => {

    const path = "/users";
    const routes = routeMap(path, User);

    routes[path].get = getAll(User, "username");
    bindRoutes(app, routes);
    registerController(app);

};

export default initialize;