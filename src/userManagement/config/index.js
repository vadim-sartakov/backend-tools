import User from '../model/user';
import Role from '../model/role';
import CrudRouter from "../../controller/crudController";

const initialize = app => {

    /*const routes = routeMap("/users", User);

    routes.getAll = getAll(User, () => User.find({}, "username"));
    routes.getOne = getOne(User, req => User.findById(req.params.id)
            .populate({ path: "roles", model: "Role", select: "key" })
    );
    bindRoutes(app, routes);
    bindRoutes(app, routeMap("/roles", Role));*/

    const crudRouter = new CrudRouter(User);
    crudRouter.routeMap.addOne.query = () => User.find({}, "username");
    //routeMap.getOne.query = ;

    app.use("/users", createRouter(routeMap));

};

export default initialize;